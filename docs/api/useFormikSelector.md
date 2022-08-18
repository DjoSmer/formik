---
id: useFormikSelector
title: useFormikSelector()
---

Allows you to extract data from the Formik state, using a selector function.

## Type signature
```tsx
type FormikSelector<Values, RT = unknown> = (formikState: FormikState<Values>) => RT;

useFormikSelector<Values, RT = unknown>(selector: FormikSelector<Values, RT>): RT;
```

## Example

```tsx
import React from 'react';
import { Field, Form, Formik, useFormikSelector } from 'formik2nd';

const MyInput = ({ field, form, ...props }) => {
  return <input {...field} {...props} />;
};

export const WatchColorField = () => {
  const color = useFormikSelector(
    ({ values }) => values.color
  );
  return (<span>{color}</span>);
};

const Example = () => (
  <div>
    <h1>My Form</h1>
    <Formik
      initialValues={{ email: '', color: 'red', firstName: '', lastName: '' }}
      onSubmit={(values, actions) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          actions.setSubmitting(false);
        }, 1000);
      }}
    >
      {(props) => (
        <Form>
          <WatchColorField/>
          <Field type="email" name="email" placeholder="Email" />
          <Field as="select" name="color">
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </Field>

          <Field name="lastName" placeholder="Doe" component={MyInput} />
          <button type="submit">Submit</button>
        </Form>
      )}
    </Formik>
  </div>
);
```