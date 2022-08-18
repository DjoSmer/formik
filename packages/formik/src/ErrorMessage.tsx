import * as React from 'react';
import { getIn, isFunction } from './utils';
import { useFormikSelector } from './useFormikSelector';

export interface ErrorMessageProps {
  name: string;
  className?: string;
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
