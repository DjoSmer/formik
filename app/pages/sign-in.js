import React, { useEffect, useState } from 'react';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  useFormikContext,
  useFormikSelector,
} from 'formik2nd';
import * as Yup from 'yup';
import { useRouter } from 'next/router';

const WatchField = () => {
  const { values, errors, touched } = useFormikSelector(
    ({ values, errors, touched }) => ({
      values,
      errors,
      touched,
    })
  );
  const { setErrorLog } = useFormikContext();

  useEffect(() => {
    if (errors.username && touched.username) {
      setErrorLog((logs) => [
        ...logs,
        {
          name: 'username',
          value: values.username,
          error: errors.username,
        },
      ]);
    }

    if (errors.password && touched.password) {
      setErrorLog((logs) => [
        ...logs,
        {
          name: 'password',
          value: values.password,
          error: errors.password,
        },
      ]);
    }
  }, [
    values.username,
    errors.username,
    touched.username,
    values.password,
    errors.password,
    touched.password,
  ]);
};

const SignIn = () => {
  const router = useRouter();
  const [errorLog, setErrorLog] = useState([]);

  return (
    <div>
      <h1>Sign In</h1>

      <Formik
        {...{
          validateOnMount: router.query.validateOnMount === 'true',
          validateOnBlur: router.query.validateOnBlur !== 'false',
          validateOnChange: router.query.validateOnChange !== 'false',
          initialValues: { username: '', password: '' },
          validationSchema: Yup.object().shape({
            username: Yup.string().required('Required'),
            password: Yup.string().required('Required'),
          }),
          onSubmit: async (values) => {
            await new Promise((r) => setTimeout(r, 500));
            alert(JSON.stringify(values, null, 2));
          },
        }}
      >
        <Form>
          <WatchField />
          <div>
            <Field name="username" placeholder="Username" />
            <ErrorMessage name="username" component="p" />
          </div>

          <div>
            <Field name="password" placeholder="Password" type="password" />
            <ErrorMessage name="password" component="p" />
          </div>

          <button type="submit" disabled={!formik.isValid}>
            Submit
          </button>

          <button
            type="reset"
            onClick={() => {
              setErrorLog([]);
            }}
          >
            Reset
          </button>

          <pre id="error-log">{JSON.stringify(errorLog, null, 2)}</pre>
        </Form>
      </Formik>
    </div>
  );
};

export default SignIn;
