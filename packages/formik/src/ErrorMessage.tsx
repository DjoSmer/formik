import * as React from 'react';
import { getIn, isFunction } from './utils';
import { useFormikSelector } from './useFormikSelector';

export interface ErrorMessageProps
  extends Omit<React.HTMLAttributes<any>, 'children'> {
  name: string;
  component?: string | React.ComponentType;
  children?: (errorMessage: string) => React.ReactNode;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = (props) => {
  const { component, children, name, ...rest } = props;

  const { touch, error } = useFormikSelector(({ touched, errors }) => ({
    touch: getIn(touched, name),
    error: getIn(errors, name),
  }));

  return !!touch && !!error
    ? children
      ? isFunction(children)
        ? children(error)
        : null
      : component
      ? React.createElement(component, rest as any, error)
      : error
    : null;
};
