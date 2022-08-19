---
id: useFormikSelector
title: useFormikSelector()
---

Allows you to extract data from the Formik state, using a selector function.

## Type signature

```ts
declare function useFormikSelector<Values extends FormikValues = FormikValues, RT = unknown>(
  selector: (formikState: FormikState<Values>) => RT
): RT
```

## Example

```tsx
import React from 'react';
import { Field, Form, Formik, FormikState, useFormikSelector } from 'formik2nd';

const initialValues = { email: '', color: 'red', firstName: '', lastName: '' }
type InitialValues = typeof initialValues;

export const WatchColorField = () => {
  const color = useFormikSelector(
    ({ values }: FormikState<InitialValues>) => values.color
  );
  return (<span>{color}</span>);
};

const Example = () => (
  <div>
    <h1>My Form</h1>
    <Formik
      initialValues={initialValues}
      onSubmit={(values, actions) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          actions.setSubmitting(false);
        }, 1000);
      }}
    >
      {(props) => (
        <Form>
          <WatchColorField />
          <Field type="email" name="email" placeholder="Email" />
           <Field name="lastName" placeholder="Doe" />
          <button type="submit">Submit</button>
        </Form>
      )}
    </Formik>
  </div>
);
```

## Define Typed Hooks
While it's possible to import the FormikState<Values> types into each component, it's better to create typed versions of the useFormikSelector hooks for usage in your application.
This is important for useFormikSelector, it saves you the need to type (state: FormikState<Values>) every time

## Example

```tsx
import React from 'react';
import { Field, Form, Formik, TypedUseFormikSelector, useFormikSelector } from 'formik2nd';

const initialValues = { email: '', color: 'red', firstName: '', lastName: '' }
type InitialValues = typeof initialValues;

// Use throughout your app instead of plain `useFormikSelector`
export const useMyFormikSelector: TypedUseFormikSelector<InitialValues> = useFormikSelector

export const WatchColorField = () => {
  const color = useMyFormikSelector(
    ({ values }) => values.color
  );
  return (<span>{color}</span>);
};

const Example = () => (
  <div>
    <h1>My Form</h1>
    <Formik
      initialValues={initialValues}
      onSubmit={(values, actions) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          actions.setSubmitting(false);
        }, 1000);
      }}
    >
      <Form>
        <WatchColorField />
        <Field type="email" name="email" placeholder="Email" />
        <Field name="lastName" placeholder="Doe" />
        <button type="submit">Submit</button>
      </Form>
    </Formik>
  </div>
);
```