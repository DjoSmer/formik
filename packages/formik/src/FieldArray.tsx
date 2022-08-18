import * as React from 'react';
import cloneDeep from 'lodash/cloneDeep';
import {
  FormikContextType,
  FormikState,
  SharedRenderProps,
  FormikProps,
} from './types';
import {
  getIn,
  isEmptyChildren,
  isFunction,
  setIn,
  isEmptyArray,
  Deferred,
} from './utils';
import { FormikContext } from './FormikContext';

export type FieldArrayRenderProps = ArrayHelpers & {
  form: FormikProps<any>;
  name: string;
};

export type FieldArrayConfig = {
  /** Really the path to the array field to be updated */
  name: string;
  /** Should field array validate the form AFTER array updates/changes? */
  validateOnChange?: boolean;
} & SharedRenderProps<FieldArrayRenderProps>;
export interface ArrayHelpers {
  /** Imperatively add a value to the end of an array */
  push: (obj: any) => void;
  /** Curried fn to add a value to the end of an array */
  handlePush: (obj: any) => () => void;
  /** Imperatively swap two values in an array */
  swap: (indexA: number, indexB: number) => void;
  /** Curried fn to swap two values in an array */
  handleSwap: (indexA: number, indexB: number) => () => void;
  /** Imperatively move an element in an array to another index */
  move: (from: number, to: number) => void;
  /** Imperatively move an element in an array to another index */
  handleMove: (from: number, to: number) => () => void;
  /** Imperatively insert an element at a given index into the array */
  insert: (index: number, value: any) => void;
  /** Curried fn to insert an element at a given index into the array */
  handleInsert: (index: number, value: any) => () => void;
  /** Imperatively replace a value at an index of an array  */
  replace: (index: number, value: any) => void;
  /** Curried fn to replace an element at a given index into the array */
  handleReplace: (index: number, value: any) => () => void;
  /** Imperatively add an element to the beginning of an array and return its length */
  unshift: (value: any) => Promise<number>;
  /** Curried fn to add an element to the beginning of an array */
  handleUnshift: (value: any) => () => void;
  /** Curried fn to remove an element at an index of an array */
  handleRemove: (index: number) => () => void;
  /** Curried fn to remove a value from the end of the array */
  handlePop: () => () => void;
  /** Imperatively remove and element at an index of an array */
  remove<T>(index: number): Promise<T> | undefined;
  /** Imperatively remove and return value from the end of the array */
  pop<T>(): Promise<T> | undefined;
}
type FieldArrayState = { count: number };

/**
 * Some array helpers!
 */
export const move = (array: any[], from: number, to: number) => {
  const copy = copyArrayLike(array);
  const value = copy[from];
  copy.splice(from, 1);
  copy.splice(to, 0, value);
  return copy;
};

export const swap = (
  arrayLike: ArrayLike<any>,
  indexA: number,
  indexB: number
) => {
  const copy = copyArrayLike(arrayLike);
  const a = copy[indexA];
  copy[indexA] = copy[indexB];
  copy[indexB] = a;
  return copy;
};

export const insert = (
  arrayLike: ArrayLike<any>,
  index: number,
  value: any
) => {
  const copy = copyArrayLike(arrayLike);
  copy.splice(index, 0, value);
  return copy;
};

export const replace = (
  arrayLike: ArrayLike<any>,
  index: number,
  value: any
) => {
  const copy = copyArrayLike(arrayLike);
  copy[index] = value;
  return copy;
};

const copyArrayLike = (arrayLike: ArrayLike<any>) => {
  if (!arrayLike) {
    return [];
  } else if (Array.isArray(arrayLike)) {
    return [...arrayLike];
  } else {
    const maxIndex = Object.keys(arrayLike)
      .map((key) => parseInt(key))
      .reduce((max, el) => (el > max ? el : max), 0);
    return Array.from({ ...arrayLike, length: maxIndex + 1 });
  }
};

class FieldArrayInner<Values = {}> extends React.Component<
  FieldArrayConfig,
  FieldArrayState
> {
  static defaultProps = {
    validateOnChange: true,
  };
  static contextType = FormikContext;
  context!: FormikContextType<Values>;

  unsubscribe = () => {};

  constructor(props: FieldArrayConfig) {
    super(props);
    // We need TypeScript generics on these, so we'll bind them in the constructor
    // @todo Fix TS 3.2.1
    this.remove = this.remove.bind(this) as any;
    this.pop = this.pop.bind(this) as any;

    this.state = {
      count: 0,
    };
  }

  componentDidMount() {
    const { name, validateOnChange } = this.props;
    const {
      state: { values },
      subscribe,
    } = this.context;
    let prevValue = getIn(values, name);
    this.unsubscribe = subscribe((state, formik) => {
      const value = getIn(state.values, name);
      if (validateOnChange && formik.validateOnChange && prevValue !== value) {
        formik.validateForm(state.values);
      }
      if (this.state.count !== value.length) {
        this.setState({ count: value.length });
      }
      prevValue = value;
    });

    this.setState({
      count: Array.isArray(prevValue) ? prevValue.length : 0,
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  updateArrayField = (
    fn: Function,
    alterTouched: boolean | Function,
    alterErrors: boolean | Function
  ) => {
    const { name } = this.props;
    const { setFormikState } = this.context;
    const deferred = new Deferred();
    setFormikState((prevState: FormikState<any>) => {
      let updateErrors = typeof alterErrors === 'function' ? alterErrors : fn;
      let updateTouched =
        typeof alterTouched === 'function' ? alterTouched : fn;

      // values fn should be executed before updateErrors and updateTouched,
      // otherwise it causes an error with unshift.
      let values = setIn(
        prevState.values,
        name,
        fn(getIn(prevState.values, name))
      );

      let fieldError = alterErrors
        ? updateErrors(getIn(prevState.errors, name))
        : undefined;
      let fieldTouched = alterTouched
        ? updateTouched(getIn(prevState.touched, name))
        : undefined;

      if (isEmptyArray(fieldError)) {
        fieldError = undefined;
      }
      if (isEmptyArray(fieldTouched)) {
        fieldTouched = undefined;
      }

      return {
        values: { ...values },
        errors: alterErrors
          ? setIn(prevState.errors, name, fieldError)
          : prevState.errors,
        touched: alterTouched
          ? setIn(prevState.touched, name, fieldTouched)
          : prevState.touched,
      };
    }, deferred.resolve as () => void);

    return deferred.promise;
  };

  push = (value: any) =>
    this.updateArrayField(
      (arrayLike: ArrayLike<any>) => [
        ...copyArrayLike(arrayLike),
        cloneDeep(value),
      ],
      false,
      false
    );

  handlePush = (value: any) => () => this.push(value);

  swap = (indexA: number, indexB: number) =>
    this.updateArrayField(
      (array: any[]) => swap(array, indexA, indexB),
      true,
      true
    );

  handleSwap = (indexA: number, indexB: number) => () =>
    this.swap(indexA, indexB);

  move = (from: number, to: number) =>
    this.updateArrayField((array: any[]) => move(array, from, to), true, true);

  handleMove = (from: number, to: number) => () => this.move(from, to);

  insert = (index: number, value: any) =>
    this.updateArrayField(
      (array: any[]) => insert(array, index, value),
      (array: any[]) => insert(array, index, null),
      (array: any[]) => insert(array, index, null)
    );

  handleInsert = (index: number, value: any) => () => this.insert(index, value);

  replace = (index: number, value: any) =>
    this.updateArrayField(
      (array: any[]) => replace(array, index, value),
      false,
      false
    );

  handleReplace = (index: number, value: any) => () =>
    this.replace(index, value);

  unshift = async (value: any) => {
    let length = -1;

    await this.updateArrayField(
      (array: any[]) => {
        const arr = array ? [value, ...array] : [value];
        if (length < 0) {
          length = arr.length;
        }
        return arr;
      },
      (array: any[]) => {
        const arr = array ? [null, ...array] : [null];
        if (length < 0) {
          length = arr.length;
        }
        return arr;
      },
      (array: any[]) => {
        const arr = array ? [null, ...array] : [null];
        if (length < 0) {
          length = arr.length;
        }
        return arr;
      }
    );

    return length;
  };

  handleUnshift = (value: any) => () => this.unshift(value);

  async remove<T>(index: number): Promise<T> {
    // We need to make sure we also remove relevant pieces of `touched` and `errors`
    let result: any;
    await this.updateArrayField(
      // so this gets call 3 times
      (array?: any[]) => {
        const copy = array ? copyArrayLike(array) : [];
        if (!result) {
          result = copy[index];
        }
        if (isFunction(copy.splice)) {
          copy.splice(index, 1);
        }
        return copy;
      },
      true,
      true
    );

    return result as T;
  }

  handleRemove = (index: number) => () => this.remove<any>(index);

  async pop<T>(): Promise<T> {
    // Remove relevant pieces of `touched` and `errors` too!
    let result: any;
    await this.updateArrayField(
      // so this gets call 3 times
      (array: any[]) => {
        const tmp = array;
        if (!result) {
          result = tmp && tmp.pop && tmp.pop();
        }
        return tmp;
      },
      true,
      true
    );

    return result as T;
  }

  handlePop = () => () => this.pop<any>();

  render() {
    const arrayHelpers: ArrayHelpers = {
      push: this.push,
      pop: this.pop,
      swap: this.swap,
      move: this.move,
      insert: this.insert,
      replace: this.replace,
      unshift: this.unshift,
      remove: this.remove,
      handlePush: this.handlePush,
      handlePop: this.handlePop,
      handleSwap: this.handleSwap,
      handleMove: this.handleMove,
      handleInsert: this.handleInsert,
      handleReplace: this.handleReplace,
      handleUnshift: this.handleUnshift,
      handleRemove: this.handleRemove,
    };

    const { component, children, name } = this.props;
    const {
      validate: _validate,
      validationSchema: _validationSchema,
      ...restOfFormik
    } = this.context;

    const props: FieldArrayRenderProps = {
      ...arrayHelpers,
      form: restOfFormik,
      name,
    };

    return component
      ? React.createElement(component as any, props)
      : children // children come last, always called
      ? isFunction(children)
        ? children(props)
        : !isEmptyChildren(children)
        ? React.Children.only(children)
        : null
      : null;
  }
}

export const FieldArray = FieldArrayInner;
