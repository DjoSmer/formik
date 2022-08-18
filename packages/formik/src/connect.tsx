import * as React from 'react';
import { FormikContextType } from './types';
import { useFormikContext } from './FormikContext';
import invariant from 'tiny-warning';

export type WithFormik<Values> = {
  formik: FormikContextType<Values>;
};

/**
 * Connect any component to Formik context, and inject as a prop called `formik`;
 * @param Comp React Component
 */
export function connect<OuterProps, Values = {}>(
  Comp: React.ComponentType<OuterProps & WithFormik<Values>>
) {
  const ConnectFormik: React.FC<OuterProps> = (props) => {
    const formik = useFormikContext<Values>();

    React.useEffect(() => {
      invariant(
        !!formik,
        `Formik context is undefined, please verify you are rendering <Form>, <Field>, <FastField>, <FieldArray>, or your custom context-using component as a child of a <Formik> component. Component name: ${Comp.name}`
      );
    }, []);

    const compProps: OuterProps & WithFormik<Values> = { ...props, formik };
    return React.createElement(Comp, compProps);
  };

  const componentDisplayName =
    Comp.displayName ||
    Comp.name ||
    (Comp.constructor && Comp.constructor.name) ||
    'Component';

  ConnectFormik.displayName = `FormikConnect(${componentDisplayName})`;

  // Assign Comp to C.WrappedComponent so we can access the inner component in tests
  // For example, <Field.WrappedComponent /> gets us <FieldInner/>
  (
    ConnectFormik as React.FC<OuterProps> & {
      WrappedComponent: React.ComponentType<OuterProps & WithFormik<Values>>;
    }
  ).WrappedComponent = Comp;

  return ConnectFormik;
}
