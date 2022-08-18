import * as React from 'react';
import {
  FormikProps,
  GenericFieldHTMLAttributes,
  FieldMetaProps,
  FieldHelperProps,
  FieldInputProps,
  FieldValidator,
} from './types';
import { useFormikContext } from './FormikContext';
import { isFunction, isObject, getIn } from './utils';
import invariant from 'tiny-warning';
import { useFormikSelector } from './useFormikSelector';

export interface FieldProps<V = any, FormValues = any> {
  field: FieldInputProps<V>;
  form: FormikProps<FormValues>; // if ppl want to restrict this for a given form, let them.
  meta: FieldMetaProps<V>;
}

export interface FieldConfig<V = any> {
  /**
   * Field component to render. Can either be a string like 'select' or a component.
   */
  component?:
    | string
    | React.ComponentType<FieldProps<V>>
    | React.ForwardRefExoticComponent<any>;

  /**
   * Component to render. Can either be a string e.g. 'select', 'input', or 'textarea', or a component.
   */
  as?:
    | string
    | React.ComponentType<FieldProps<V>['field']>
    | React.ForwardRefExoticComponent<any>;

  /**
   * Children render function <Field name>{props => ...}</Field>)
   */
  children?: ((props: FieldProps<V>) => React.ReactNode) | React.ReactNode;

  /**
   * Validate a single field value independently
   */
  validate?: FieldValidator;

  /**
   * Field name
   */
  name: string;

  /** HTML input type */
  type?: string;

  /** Field value */
  value?: any;

  /** Inner ref */
  innerRef?: (instance: any) => void;
}

export type FieldAttributes<T> = FieldConfig<T> &
  Omit<GenericFieldHTMLAttributes, 'children'> & { name: string };

export type FieldHookConfig<T> = GenericFieldHTMLAttributes & FieldConfig<T>;

export function useField<Val = any>(
  propsOrFieldName: string | FieldHookConfig<Val>
): [FieldInputProps<Val>, FieldMetaProps<Val>, FieldHelperProps<Val>] {
  const formik = useFormikContext();
  const {
    getFieldProps,
    getFieldMeta,
    getFieldHelpers,
    registerField,
    unregisterField,
  } = formik;

  const isAnObject = isObject(propsOrFieldName);

  // Normalize propsOrFieldName to FieldHookConfig<Val>
  const props: FieldHookConfig<Val> = isAnObject
    ? (propsOrFieldName as FieldHookConfig<Val>)
    : { name: propsOrFieldName as string };

  const { name: fieldName, validate: validateFn } = props;

  useFormikSelector(({ values, errors, touched }) => ({
    value: getIn(values, fieldName),
    error: getIn(errors, fieldName),
    touched: getIn(touched, fieldName),
  }));

  React.useEffect(() => {
    if (fieldName) {
      registerField(fieldName, {
        validate: validateFn,
      });
    }
    return () => {
      if (fieldName) {
        unregisterField(fieldName);
      }
    };
  }, [registerField, unregisterField, fieldName, validateFn]);

  if (__DEV__) {
    invariant(
      formik,
      'useField() / <Field /> must be used underneath a <Formik> component or withFormik() higher order component'
    );
  }

  invariant(
    fieldName,
    'Invalid field name. Either pass `useField` a string or an object containing a `name` key.'
  );

  return [
    getFieldProps(props),
    getFieldMeta(fieldName),
    getFieldHelpers(fieldName),
  ];
}

export const Field: React.FC<FieldAttributes<any>> = (inProps) => {
  const {
    validate,
    name,
    children,
    as: is, // `as` is reserved in typescript lol
    component,
    ...props
  } = inProps;

  const {
    validate: _validate,
    validationSchema: _validationSchema,

    ...formik
  } = useFormikContext();

  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      invariant(
        !(is && children && isFunction(children)),
        'You should not use <Field as> and <Field children> as a function in the same <Field> component; <Field as> will be ignored.'
      );

      invariant(
        !(component && children && isFunction(children)),
        'You should not use <Field component> and <Field children> as a function in the same <Field> component; <Field component> will be ignored.'
      );
      // eslint-disable-next-line
    }, []);
  }

  const [field, meta] = useField({ name, validate });

  const legacyBag = { field, form: formik };

  if (isFunction(children)) {
    return children({ ...legacyBag, meta }) as React.ReactElement;
  }

  if (component) {
    // This behavior is backwards compat with earlier Formik 0.9 to 1.x
    if (typeof component === 'string') {
      const { innerRef, ...rest } = props;
      return React.createElement(
        component,
        { ref: innerRef, ...field, ...rest },
        children
      );
    }

    // We don't pass `meta` for backwards compat - DjoSmer: I don't understand, why do it need
    return React.createElement(
      component,
      { meta, ...props, ...legacyBag },
      children
    );
  }

  // default to input here so we can check for both `as` and `children` above
  const asElement = is || 'input';

  if (typeof asElement === 'string') {
    const { innerRef, ...rest } = props;
    return React.createElement(
      asElement,
      { ref: innerRef, ...field, ...rest },
      children
    );
  }

  return React.createElement(asElement, { ...field, ...props }, children);
};
