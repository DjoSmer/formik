<h1 align="center">Formik2nd</h1>

<h3 align="center">
Build forms in React, without the tears😭 
<br/>and without unnecessary re-renders🥳
</h3>

## Fork changes

### After changing a field, other fields aren't re-render.
Work only `<Formik children/>` as `ReactNode`. If you use `<Formik component/>` or `<Formik children/>` as function, formik run re-render after any change filed.

Formik - https://codesandbox.io/s/formik-rerender-test-v8gw7x <br/>
Formik2nd - https://codesandbox.io/s/formik2nd-rerender-test-forked-mlwvqr 

### Support React 16, 17, 18
### New hook [useFormikSelector](/docs/api/useFormikSelector.md)
### FormikState move to FormikProps.state
`FormikState` used to be included in FormikProps. Now FormikState is in the `state` properties of `FormikProps`.
### FormikProps.dirty => FormikProps.isDirty()
### FormikProps.isValid => FormikProps.isValid()
### FastFiled === Field
Difference between `FastField` and `Field`, `FastField` is only re-render after formik state change by its name.

### FieldArray, methods pop, remove, unshift return Promise 
### hook useFormik don't work
Because now Formik without FormikProvider don't work.

### isInitialValid has been deprecated and remove
### `<* render/>` has been deprecated and remove
ErrorMessage, Field, FieldArray, Formik.

### `<Formik innerRef/>` don't work

---
##Forked from [jaredpalmer/formik](https://github.com/jaredpalmer/formik)

## Related

- [TSDX](https://github.com/jaredpalmer/tsdx) - Zero-config CLI for TypeScript used by this repo. (Formik's Rollup configuration as a CLI)

---

[MIT License.](/LICENSE)
