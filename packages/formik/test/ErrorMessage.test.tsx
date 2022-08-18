import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Formik, FormikProps, ErrorMessage } from '../src';
import { noop } from 'lodash';

interface TestFormValues {
  name: string;
  email: string;
}

const TestForm: React.FC<any> = (p) => (
  <Formik
    onSubmit={noop}
    initialValues={{ name: 'jared', email: 'hello@reason.nyc' }}
    {...p}
  />
);
fdescribe('<ErrorMessage />', () => {
  it('renders with component span', async () => {
    let actualFProps: any;
    let message = 'Wrong';
    render(
      <TestForm>
        {(fProps: FormikProps<TestFormValues>) => {
          actualFProps = fProps;
          return (
            <div>
              <ErrorMessage name="email" component="span" />
            </div>
          );
        }}
      </TestForm>
    );

    await act(async () => {
      await actualFProps.setFieldTouched('email');
    });

    // Only renders if Field has been visited.
    expect(!!screen.queryByText(message)).toBeFalsy();

    await act(async () => {
      await actualFProps.setFieldError('email', message);
    });

    // Renders after being visited with an error.
    expect(!!screen.getByText(message)).toBeTruthy();
  });

  it('renders with children as a function', async () => {
    let actualFProps: any;
    let message = 'Wrong';
    render(
      <TestForm>
        {(fProps: FormikProps<TestFormValues>) => {
          actualFProps = fProps;
          return (
            <div>
              <ErrorMessage name="email">
                {(props) => <div>{props}</div>}
              </ErrorMessage>
            </div>
          );
        }}
      </TestForm>
    );

    await act(async () => {
      await actualFProps.setFieldTouched('email');
    });

    // Only renders if Field has been visited.
    expect(!!screen.queryByText(message)).toBeFalsy();

    await act(async () => {
      await actualFProps.setFieldError('email', message);
    });

    // Renders after being visited with an error.
    expect(!!screen.getByText(message)).toBeTruthy();
  });
});
