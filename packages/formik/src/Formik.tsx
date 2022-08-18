import * as React from 'react';
import isEqual from 'react-fast-compare';
import deepmerge from 'deepmerge';
import isPlainObject from 'lodash/isPlainObject';
import {
  FieldHelperProps,
  FieldInputProps,
  FieldMetaProps,
  FieldValidator,
  FormikConfig,
  FormikErrors,
  FormikEventListener,
  FormikEvents,
  FormikHelpers,
  FormikRegistration,
  FormikState,
  FormikTouched,
  FormikValues,
} from './types';
import {
  getActiveElement,
  getIn,
  isFunction,
  isObject,
  isPromise,
  isString,
  setIn,
  setNestedObjectValues,
} from './utils';
import { FormikProvider } from './FormikContext';
import invariant from 'tiny-warning';
import { createEventManager } from '@djosmer/event-manager';

// Initial empty states // objects
const emptyErrors: FormikErrors<unknown> = {};
const emptyTouched: FormikTouched<unknown> = {};

// This is an object that contains a map of all registered fields
// and their validate functions
interface FieldRegistry {
  [field: string]: {
    validate?: FieldValidator;
  };
}

export function useFormik<Values extends FormikValues = FormikValues>() {}

export class Formik<
  Values extends FormikValues = FormikValues
> extends React.Component<FormikConfig<Values>, FormikState<Values>> {
  static defaultProps = {
    validateOnChange: true,
    validateOnBlur: true,
    validateOnMount: false,
    enableReinitialize: false,
  };

  eventManager = createEventManager<FormikEventListener<Values>>();
  initialValues: Values;
  initialErrors: FormikErrors<Values>;
  initialTouched = emptyTouched;
  initialStatus: any;
  _isMounted = true;
  fieldRegistry: FieldRegistry = {};

  constructor(props: FormikConfig<Values>) {
    super(props);

    this.state = {
      values: props.initialValues,
      errors: props.initialErrors || emptyErrors,
      touched: props.initialTouched || emptyTouched,
      status: props.initialStatus,
      isSubmitting: false,
      isValidating: false,
      submitCount: 0,
    };

    this.initialValues = props.initialValues;
    this.initialErrors = props.initialErrors || emptyErrors;
    this.initialTouched = props.initialTouched || emptyTouched;
    this.initialStatus = props.initialStatus;
  }

  componentDidUpdate(
    prevProps: Readonly<FormikConfig<Values>>,
    prevState: Readonly<FormikState<Values>>
  ) {
    const {
      validateOnMount,
      enableReinitialize,
      initialValues,
      initialErrors,
      initialTouched,
      initialStatus,
    } = this.props;

    if (prevState !== this.state) {
      this.eventManager.emit(FormikEvents.stateUpdate, this.state, this);
    }

    if (
      validateOnMount &&
      this._isMounted &&
      isEqual(this.initialValues, initialValues)
    ) {
      this.validateFormWithHighPriority(this.initialValues);
    }

    if (this._isMounted && !isEqual(this.initialValues, initialValues)) {
      if (enableReinitialize) {
        this.initialValues = initialValues;
        this.resetForm();
      }

      if (validateOnMount) {
        this.validateFormWithHighPriority(this.initialValues);
      }
    }

    if (enableReinitialize && this._isMounted) {
      if (!isEqual(this.initialErrors, initialErrors)) {
        this.initialErrors = initialErrors || emptyErrors;
        this.setErrors(this.initialErrors);
      }

      if (!isEqual(this.initialTouched, initialTouched)) {
        this.initialTouched = initialTouched || emptyTouched;
        this.setTouched(this.initialTouched);
      }

      if (!isEqual(this.initialStatus, initialStatus)) {
        this.initialStatus = initialStatus;
        this.setStatus(this.initialStatus);
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  subscribe = (listener: FormikEventListener<Values>) => {
    return this.eventManager.on(FormikEvents.stateUpdate, listener);
  };

  runValidateHandler = (
    values: Values,
    field?: string
  ): Promise<FormikErrors<Values>> => {
    const { props } = this;
    return new Promise((resolve, reject) => {
      const maybePromisedErrors = (props.validate as any)(values, field);
      if (maybePromisedErrors == null) {
        // use loose null check here on purpose
        resolve(emptyErrors);
      } else if (isPromise(maybePromisedErrors)) {
        (maybePromisedErrors as Promise<any>).then(
          (errors) => {
            resolve(errors || emptyErrors);
          },
          (actualException) => {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `Warning: An unhandled error was caught during validation in <Formik validate />`,
                actualException
              );
            }

            reject(actualException);
          }
        );
      } else {
        resolve(maybePromisedErrors);
      }
    });
  };

  /**
   * Run validation against a Yup schema and optionally run a function if successful
   */
  runValidationSchema = (
    values: Values,
    field?: string
  ): Promise<FormikErrors<Values>> => {
    const { props } = this;
    const validationSchema = props.validationSchema;
    const schema = isFunction(validationSchema)
      ? validationSchema(field)
      : validationSchema;
    const promise =
      field && schema.validateAt
        ? schema.validateAt(field, values)
        : validateYupSchema(values, schema);
    return new Promise((resolve, reject) => {
      promise.then(
        () => {
          resolve(emptyErrors);
        },
        (err: any) => {
          // Yup will throw a validation error if validation fails. We catch those and
          // resolve them into Formik errors. We can sniff if something is a Yup error
          // by checking error.name.
          // @see https://github.com/jquense/yup#validationerrorerrors-string--arraystring-value-any-path-string
          if (err.name === 'ValidationError') {
            resolve(yupToFormErrors(err));
          } else {
            // We throw any other errors
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `Warning: An unhandled error was caught during validation in <Formik validationSchema />`,
                err
              );
            }

            reject(err);
          }
        }
      );
    });
  };

  runSingleFieldLevelValidation = (
    field: string,
    value: void | string
  ): Promise<string> => {
    return new Promise((resolve) =>
      resolve(this.fieldRegistry[field].validate!(value) as string)
    );
  };

  runFieldLevelValidations = (
    values: Values
  ): Promise<FormikErrors<Values>> => {
    const fieldKeysWithValidation: string[] = Object.keys(
      this.fieldRegistry
    ).filter((f) => isFunction(this.fieldRegistry[f].validate));

    // Construct an array with all of the field validation functions
    const fieldValidations: Promise<string>[] =
      fieldKeysWithValidation.length > 0
        ? fieldKeysWithValidation.map((f) =>
            this.runSingleFieldLevelValidation(f, getIn(values, f))
          )
        : [Promise.resolve('DO_NOT_DELETE_YOU_WILL_BE_FIRED')]; // use special case ;)

    return Promise.all(fieldValidations).then((fieldErrorsList: string[]) =>
      fieldErrorsList.reduce((prev, curr, index) => {
        if (curr === 'DO_NOT_DELETE_YOU_WILL_BE_FIRED') {
          return prev;
        }
        if (curr) {
          prev = setIn(prev, fieldKeysWithValidation[index], curr);
        }
        return prev;
      }, {})
    );
  };

  // Run all validations and return the result
  runAllValidations = (values: Values) => {
    const { validationSchema, validate } = this.props;
    return Promise.all([
      this.runFieldLevelValidations(values),
      validationSchema ? this.runValidationSchema(values) : {},
      validate ? this.runValidateHandler(values) : {},
    ]).then(([fieldErrors, schemaErrors, validateErrors]) => {
      return deepmerge.all<FormikErrors<Values>>(
        [fieldErrors, schemaErrors, validateErrors],
        { arrayMerge }
      );
    });
  };

  // Run all validations methods and update state accordingly
  validateFormWithHighPriority = (values?: Values) => {
    values = values || this.state.values;
    this.setState({ isValidating: true });
    return this.runAllValidations(values).then((combinedErrors) => {
      if (this._isMounted) {
        this.setState({ errors: combinedErrors, isValidating: false });
      }
      return combinedErrors;
    });
  };

  validateField = (name: string) => {
    // This will efficiently validate a single field by avoiding state
    // changes if the validation function is synchronous. It's different from
    // what is called when using validateForm.
    const { validationSchema } = this.props;
    const { values, errors } = this.state;
    const fieldValidate = this.fieldRegistry[name].validate;
    if (this.fieldRegistry[name] && isFunction(fieldValidate)) {
      const value = getIn(values, name);
      const maybePromise = fieldValidate(value);
      if (isPromise(maybePromise)) {
        // Only flip isValidating if the function is async.
        this.setState({ isValidating: true });
        return maybePromise
          .then((x: any) => x)
          .then((error: string) => {
            this.setState({
              errors: setIn(errors, name, error),
              isValidating: false,
            });
          });
      } else {
        this.setState({
          errors: setIn(errors, name, maybePromise as string | undefined),
          isValidating: false,
        });
        return Promise.resolve(maybePromise as string | undefined);
      }
    } else if (validationSchema) {
      this.setState({ isValidating: true });
      return this.runValidationSchema(values, name)
        .then((x: any) => x)
        .then((error: any) => {
          this.setState({
            errors: setIn(errors, name, error[name]),
            isValidating: false,
          });
        });
    }

    return Promise.resolve();
  };

  validateForm = this.validateFormWithHighPriority;

  registerField: FormikRegistration['registerField'] = (name, { validate }) => {
    this.fieldRegistry[name] = {
      validate,
    };
  };

  unregisterField: FormikRegistration['unregisterField'] = (name) => {
    delete this.fieldRegistry[name];
  };

  setTouched: FormikHelpers<Values>['setTouched'] = (
    touched,
    shouldValidate
  ) => {
    const { validateOnBlur } = this.props;
    const { values } = this.state;
    this.setState({ touched });
    const willValidate =
      shouldValidate === undefined ? validateOnBlur : shouldValidate;
    return willValidate
      ? this.validateFormWithHighPriority(values)
      : Promise.resolve();
  };

  setErrors: FormikHelpers<Values>['setErrors'] = (errors) => {
    this.setState({ errors });
  };

  setValues: FormikHelpers<Values>['setValues'] = (values, shouldValidate) => {
    const { validateOnChange } = this.props;
    const { values: stateValues } = this.state;
    const resolvedValues = isFunction(values) ? values(stateValues) : values;
    this.setState({ values: resolvedValues });
    const willValidate =
      shouldValidate === undefined ? validateOnChange : shouldValidate;
    return willValidate
      ? this.validateFormWithHighPriority(resolvedValues)
      : Promise.resolve();
  };

  setFieldError: FormikHelpers<Values>['setFieldError'] = (field, value) => {
    this.setState(({ errors }) => ({
      errors: setIn(errors, `${field}`, value),
    }));
  };

  setFieldValue: FormikHelpers<Values>['setFieldValue'] = (
    field,
    value,
    shouldValidate
  ) => {
    const { validateOnChange } = this.props;
    const { values } = this.state;
    this.setState({ values: setIn(values, field, value) });
    const willValidate =
      shouldValidate === undefined ? validateOnChange : shouldValidate;
    return willValidate
      ? this.validateFormWithHighPriority(setIn(values, field, value))
      : Promise.resolve();
  };

  executeChange = (
    eventOrTextValue: string | React.ChangeEvent<any>,
    maybePath?: string
  ) => {
    const { values } = this.state;
    // By default, assume that the first argument is a string. This allows us to use
    // handleChange with React Native and React Native Web's onChangeText prop which
    // provides just the value of the input.
    let field = maybePath;
    let val = eventOrTextValue;
    let parsed;
    // If the first argument is not a string though, it has to be a synthetic React Event (or a fake one),
    // so we handle like we would a normal HTML change event.
    if (!isString(eventOrTextValue)) {
      // If we can, persist the event
      // @see https://reactjs.org/docs/events.html#event-pooling
      if ((eventOrTextValue as any).persist) {
        (eventOrTextValue as React.ChangeEvent<any>).persist();
      }
      const target = eventOrTextValue.target
        ? (eventOrTextValue as React.ChangeEvent<any>).target
        : (eventOrTextValue as React.ChangeEvent<any>).currentTarget;

      const { type, name, id, value, checked, outerHTML, options, multiple } =
        target;

      field = maybePath ? maybePath : name ? name : id;
      if (!field && __DEV__) {
        warnAboutMissingIdentifier({
          htmlContent: outerHTML,
          documentationAnchorLink: 'handlechange-e-reactchangeeventany--void',
          handlerName: 'handleChange',
        });
      }
      val = /number|range/.test(type)
        ? ((parsed = parseFloat(value)), isNaN(parsed) ? '' : parsed)
        : /checkbox/.test(type) // checkboxes
        ? getValueForCheckbox(getIn(values, field!), checked, value)
        : options && multiple // <select multiple>
        ? getSelectedValues(options)
        : value;
    }

    if (field) {
      // Set form fields by name
      this.setFieldValue(field, val);
    }
  };

  handleChange = (
    eventOrPath: string | React.ChangeEvent<any>
  ): void | ((eventOrTextValue: string | React.ChangeEvent<any>) => void) => {
    if (isString(eventOrPath)) {
      return (event) => this.executeChange(event, eventOrPath);
    } else {
      this.executeChange(eventOrPath);
    }
  };

  setFieldTouched = (
    field: string,
    touched: boolean = true,
    shouldValidate?: boolean
  ) => {
    const { validateOnBlur } = this.props;
    const { values, touched: touchedState } = this.state;

    this.setState({ touched: setIn(touchedState, field, touched) });
    const willValidate =
      shouldValidate === undefined ? validateOnBlur : shouldValidate;
    return willValidate
      ? this.validateFormWithHighPriority(values)
      : Promise.resolve();
  };

  executeBlur = (e: any, path?: string) => {
    if (e.persist) {
      e.persist();
    }
    const { name, id, outerHTML } = e.target;
    const field = path ? path : name ? name : id;

    if (!field && __DEV__) {
      warnAboutMissingIdentifier({
        htmlContent: outerHTML,
        documentationAnchorLink: 'handleblur-e-any--void',
        handlerName: 'handleBlur',
      });
    }

    this.setFieldTouched(field, true);
  };

  handleBlur = (eventOrString: any): void | ((e: any) => void) => {
    if (isString(eventOrString)) {
      return (event) => this.executeBlur(event, eventOrString);
    } else {
      this.executeBlur(eventOrString);
    }
  };

  setFormikState: FormikHelpers<Values>['setFormikState'] = (stateOrCb, cb) => {
    this.setState((prevState) => {
      return isFunction(stateOrCb)
        ? (stateOrCb(prevState) as FormikState<Values>)
        : stateOrCb;
    }, cb);
  };

  setStatus: FormikHelpers<Values>['setStatus'] = (status) => {
    this.setState({ status });
  };

  setSubmitting = (isSubmitting: boolean) => {
    this.setState({ isSubmitting });
  };

  resetForm = (nextState?: Partial<FormikState<Values>>) => {
    const {
      initialValues,
      initialErrors,
      initialTouched,
      initialStatus,
      props,
      state,
    } = this;
    const values =
      nextState && nextState.values ? nextState.values : initialValues;
    const errors =
      nextState && nextState.errors
        ? nextState.errors
        : initialErrors
        ? initialErrors
        : props.initialErrors || {};
    const touched =
      nextState && nextState.touched
        ? nextState.touched
        : initialTouched
        ? initialTouched
        : props.initialTouched || {};
    const status =
      nextState && nextState.status
        ? nextState.status
        : initialStatus
        ? initialStatus
        : props.initialStatus;

    this.initialValues = values;
    this.initialErrors = errors;
    this.initialTouched = touched;
    this.initialStatus = status;

    const dispatchFn = () => {
      this.setState({
        isSubmitting: !!nextState && !!nextState.isSubmitting,
        errors,
        touched,
        status,
        values,
        isValidating: !!nextState && !!nextState.isValidating,
        submitCount:
          !!nextState &&
          !!nextState.submitCount &&
          typeof nextState.submitCount === 'number'
            ? nextState.submitCount
            : 0,
      });
    };

    if (props.onReset) {
      const maybePromisedOnReset = (props.onReset as any)(state.values, this);

      if (isPromise(maybePromisedOnReset)) {
        (maybePromisedOnReset as Promise<any>).then(dispatchFn);
      } else {
        dispatchFn();
      }
    } else {
      dispatchFn();
    }
  };

  submitForm = () => {
    const { values, submitCount } = this.state;
    this.setState({
      touched: setNestedObjectValues<FormikTouched<Values>>(values, true),
      isSubmitting: true,
      submitCount: submitCount + 1,
    });
    return this.validateFormWithHighPriority().then(
      (combinedErrors: FormikErrors<Values>) => {
        // In case an error was thrown and passed to the resolved Promise,
        // `combinedErrors` can be an instance of an Error. We need to check
        // that and abort the submit.
        // If we don't do that, calling `Object.keys(new Error())` yields an
        // empty array, which causes the validation to pass and the form
        // to be submitted.

        const isInstanceOfError = combinedErrors instanceof Error;
        const isActuallyValid =
          !isInstanceOfError && Object.keys(combinedErrors).length === 0;
        if (isActuallyValid) {
          // Proceed with submit...
          //
          // To respect sync submit fns, we can't simply wrap executeSubmit in a promise and
          // _always_ dispatch SUBMIT_SUCCESS because isSubmitting would then always be false.
          // This would be fine in simple cases, but make it impossible to disable submit
          // buttons where people use callbacks or promises as side effects (which is basically
          // all of v1 Formik code). Instead, recall that we are inside of a promise chain already,
          //  so we can try/catch executeSubmit(), if it returns undefined, then just bail.
          // If there are errors, throw em. Otherwise, wrap executeSubmit in a promise and handle
          // cleanup of isSubmitting on behalf of the consumer.
          let promiseOrUndefined;
          try {
            promiseOrUndefined = this.executeSubmit();
            // Bail if it's sync, consumer is responsible for cleaning up
            // via setSubmitting(false)
            if (promiseOrUndefined === undefined) {
              return;
            }
          } catch (error) {
            throw error;
          }

          return Promise.resolve(promiseOrUndefined)
            .then((result) => {
              if (this._isMounted) {
                this.setState({ isSubmitting: false });
              }
              return result;
            })
            .catch((_errors) => {
              if (this._isMounted) {
                this.setState({ isSubmitting: false });
                // This is a legit error rejected by the onSubmit fn
                // so we don't want to break the promise chain
                throw _errors;
              }
            });
        } else if (this._isMounted) {
          // ^^^ Make sure Formik is still mounted before updating state
          this.setState({ isSubmitting: false });
          // throw combinedErrors;
          if (isInstanceOfError) {
            throw combinedErrors;
          }
        }
        return;
      }
    );
  };

  handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e && e.preventDefault && isFunction(e.preventDefault)) {
      e.preventDefault();
    }

    if (e && e.stopPropagation && isFunction(e.stopPropagation)) {
      e.stopPropagation();
    }

    // Warn if form submission is triggered by a <button> without a
    // specified `type` attribute during development. This mitigates
    // a common gotcha in forms with both reset and submit buttons,
    // where the dev forgets to add type="button" to the reset button.
    if (__DEV__ && typeof document !== 'undefined') {
      // Safely get the active element (works with IE)
      const activeElement = getActiveElement();
      if (
        activeElement !== null &&
        activeElement instanceof HTMLButtonElement
      ) {
        invariant(
          activeElement.attributes &&
            activeElement.attributes.getNamedItem('type'),
          'You submitted a Formik form using a button with an unspecified `type` attribute.  Most browsers default button elements to `type="submit"`. If this is not a submit button, please add `type="button"`.'
        );
      }
    }

    this.submitForm().catch((reason) => {
      console.warn(
        `Warning: An unhandled error was caught from submitForm()`,
        reason
      );
    });
  };

  executeSubmit = () => {
    const {
      resetForm,
      validateForm,
      validateField,
      setErrors,
      setFieldError,
      setFieldTouched,
      setFieldValue,
      setStatus,
      setSubmitting,
      setTouched,
      setValues,
      setFormikState,
      submitForm,
    } = this;

    const imperativeMethods: FormikHelpers<Values> = {
      resetForm,
      validateForm,
      validateField,
      setErrors,
      setFieldError,
      setFieldTouched,
      setFieldValue,
      setStatus,
      setSubmitting,
      setTouched,
      setValues,
      setFormikState,
      submitForm,
    };

    return this.props.onSubmit(this.state.values, imperativeMethods);
  };

  handleReset = (e: any) => {
    if (e && e.preventDefault && isFunction(e.preventDefault)) {
      e.preventDefault();
    }

    if (e && e.stopPropagation && isFunction(e.stopPropagation)) {
      e.stopPropagation();
    }

    this.resetForm();
  };

  getFieldMeta = (name: string): FieldMetaProps<any> => {
    const { initialValues, initialErrors, initialTouched } = this;
    const { values, errors, touched } = this.state;
    return {
      value: getIn(values, name),
      error: getIn(errors, name),
      touched: !!getIn(touched, name),
      initialValue: getIn(initialValues, name),
      initialTouched: !!getIn(initialTouched, name),
      initialError: getIn(initialErrors, name),
    };
  };

  getFieldHelpers = (name: string): FieldHelperProps<any> => {
    return {
      setValue: (value: any, shouldValidate?: boolean) =>
        this.setFieldValue(name, value, shouldValidate),
      setTouched: (value: boolean, shouldValidate?: boolean) =>
        this.setFieldTouched(name, value, shouldValidate),
      setError: (value: any) => this.setFieldError(name, value),
    };
  };

  getFieldProps = (nameOrOptions: any): FieldInputProps<any> => {
    const { handleChange, handleBlur } = this;
    const { values } = this.state;
    const isAnObject = isObject(nameOrOptions);
    const name = isAnObject ? nameOrOptions.name : nameOrOptions;
    const valueState = getIn(values, name);

    const field: FieldInputProps<any> = {
      name,
      value: valueState,
      onChange: handleChange,
      onBlur: handleBlur,
    };
    if (isAnObject) {
      const {
        type,
        value: valueProp, // value is special for checkboxes
        as: is,
        multiple,
      } = nameOrOptions;

      if (type === 'checkbox') {
        if (valueProp === undefined) {
          field.checked = !!valueState;
        } else {
          field.checked = !!(
            Array.isArray(valueState) && ~valueState.indexOf(valueProp)
          );
          field.value = valueProp;
        }
      } else if (type === 'radio') {
        field.checked = valueState === valueProp;
        field.value = valueProp;
      } else if (is === 'select' && multiple) {
        field.value = field.value || [];
        field.multiple = true;
      }
    }
    return field;
  };

  isDirty = () => !isEqual(this.initialValues, this.state.values);

  isValid = () =>
    this.state.errors && Object.keys(this.state.errors).length === 0;

  getState = () => this.state;

  render() {
    const formikbag = this;
    const { component, children } = formikbag.props;

    return (
      <FormikProvider value={formikbag}>
        {component
          ? React.createElement(component as any, formikbag)
          : children
          ? isFunction(children)
            ? children(formikbag)
            : (children as React.ReactNode)
          : null}
      </FormikProvider>
    );
  }
}

function warnAboutMissingIdentifier({
  htmlContent,
  documentationAnchorLink,
  handlerName,
}: {
  htmlContent: string;
  documentationAnchorLink: string;
  handlerName: string;
}) {
  console.warn(
    `Warning: Formik called \`${handlerName}\`, but you forgot to pass an \`id\` or \`name\` attribute to your input:
    ${htmlContent}
    Formik cannot determine which value to update. For more info see https://formik.org/docs/api/formik#${documentationAnchorLink}
  `
  );
}

/**
 * Transform Yup ValidationError to a more usable object
 */
export function yupToFormErrors<Values>(yupError: any): FormikErrors<Values> {
  let errors: FormikErrors<Values> = {};
  if (yupError.inner) {
    if (yupError.inner.length === 0) {
      return setIn(errors, yupError.path, yupError.message);
    }
    for (let err of yupError.inner) {
      if (!getIn(errors, err.path)) {
        errors = setIn(errors, err.path, err.message);
      }
    }
  }
  return errors;
}

/**
 * Validate a yup schema.
 */
export function validateYupSchema<T extends FormikValues>(
  values: T,
  schema: any,
  sync: boolean = false,
  context: any = {}
): Promise<Partial<T>> {
  const validateData: FormikValues = prepareDataForValidation(values);
  return schema[sync ? 'validateSync' : 'validate'](validateData, {
    abortEarly: false,
    context: context,
  });
}

/**
 * Recursively prepare values.
 */
export function prepareDataForValidation<T extends FormikValues>(
  values: T
): FormikValues {
  let data: FormikValues = Array.isArray(values) ? [] : {};
  for (let k in values) {
    if (Object.prototype.hasOwnProperty.call(values, k)) {
      const key = String(k);
      if (Array.isArray(values[key]) === true) {
        data[key] = values[key].map((value: any) => {
          if (Array.isArray(value) === true || isPlainObject(value)) {
            return prepareDataForValidation(value);
          } else {
            return value !== '' ? value : undefined;
          }
        });
      } else if (isPlainObject(values[key])) {
        data[key] = prepareDataForValidation(values[key]);
      } else {
        data[key] = values[key] !== '' ? values[key] : undefined;
      }
    }
  }
  return data;
}

/**
 * deepmerge array merging algorithm
 * https://github.com/KyleAMathews/deepmerge#combine-array
 */
function arrayMerge(target: any[], source: any[], options: any): any[] {
  const destination = target.slice();

  source.forEach(function merge(e: any, i: number) {
    if (typeof destination[i] === 'undefined') {
      const cloneRequested = options.clone !== false;
      const shouldClone = cloneRequested && options.isMergeableObject(e);
      destination[i] = shouldClone
        ? deepmerge(Array.isArray(e) ? [] : {}, e, options)
        : e;
    } else if (options.isMergeableObject(e)) {
      destination[i] = deepmerge(target[i], e, options);
    } else if (target.indexOf(e) === -1) {
      destination.push(e);
    }
  });
  return destination;
}

/** Return multi select values based on an array of options */
function getSelectedValues(options: any[]) {
  return Array.from(options)
    .filter((el) => el.selected)
    .map((el) => el.value);
}

/** Return the next value for a checkbox */
function getValueForCheckbox(
  currentValue: string | boolean | any[],
  checked: boolean,
  valueProp: any
) {
  // If the current value was a boolean, return a boolean
  if (typeof currentValue === 'boolean') {
    return Boolean(checked);
  }

  // If the currentValue was not a boolean we want to return an array
  let currentArrayOfValues = [];
  let isValueInArray = false;
  let index = -1;

  if (!Array.isArray(currentValue)) {
    // eslint-disable-next-line eqeqeq
    if (!valueProp || valueProp == 'true' || valueProp == 'false') {
      return Boolean(checked);
    }
  } else {
    // If the current value is already an array, use it
    currentArrayOfValues = currentValue;
    index = currentValue.indexOf(valueProp);
    isValueInArray = index >= 0;
  }

  // If the checkbox was checked and the value is not already present in the aray we want to add the new value to the array of values
  if (checked && valueProp && !isValueInArray) {
    return currentArrayOfValues.concat(valueProp);
  }

  // If the checkbox was unchecked and the value is not in the array, simply return the already existing array of values
  if (!isValueInArray) {
    return currentArrayOfValues;
  }

  // If the checkbox was unchecked and the value is in the array, remove the value and return the array
  return currentArrayOfValues
    .slice(0, index)
    .concat(currentArrayOfValues.slice(index + 1));
}
