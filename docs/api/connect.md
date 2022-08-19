---
id: connect
title: connect()
---

`connect()` is a higher-order component (HoC) that allows you to hook anything into Formik's context. It is used internally to construct `<Field>` and `<Form>`, but you can use it to build out new components as your needs change.
<br/>
**since v3, a component connected via `connect()` is not re-render after changing the state.**

## Type signature

```tsx
declare function connect<OuterProps, Values = any>(Comp: React.ComponentType<OuterProps & { formik: FormikContext<Values> }>) => React.ComponentType<OuterProps>
```

## Example

### FunctionComponent

```jsx
import React, { useEffect } from 'react';
import { connect, getIn } from 'formik2nd';

// This component renders an error message if a field has
// an error and it's already been touched.
const ErrorMessage = props => {
  // All FormikProps available on props.formik!
  // with v3
  const {error, touch} = useFormikSelector(({errors, touched}) => 
    ({error: getIn(errors, props.name), touch: touched(errors, props.name)}));
  return touch && error ? error : null;
};

export default connect(ErrorMessage);
```

### ComponentClass

```jsx
import React, { useEffect } from 'react';
import { connect, getIn } from 'formik2nd';

class ErrorMessage extends React.Component {
  unsubscribe = () => {};

  constructor(props) {
    super(props);
    
    this.state = {
      error: '',
      touch: false
    }
  }

  componentDidMount() {
    const {
      name, formik: {
        state: { values },
        subscribe,
      }, validateOnChange
    } = this.props;

    this.unsubscribe = subscribe((state, formik) => {
      const error = getIn(state.errors, name);
      const touch = getIn(state.touched, name);
      this.setState({ error, touch });
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    const {touch, error} = this.state;
    return touch && error ? error : null;
  }
};

export default connect(ErrorMessage);
```
