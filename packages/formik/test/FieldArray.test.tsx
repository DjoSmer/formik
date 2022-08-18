import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { FieldArray, Formik, isFunction } from '../src';

const noop = () => {};

const friends = ['jared', 'andrea', 'brent'];
const TestForm: React.FC<any> = (p) => (
  <Formik onSubmit={noop} initialValues={{ friends: [...friends] }} {...p} />
);

describe('<FieldArray />', () => {
  it('renders component with array helpers as props', () => {
    const TestComponent = (arrayProps: any) => {
      expect(isFunction(arrayProps.push)).toBeTruthy();
      return null;
    };

    render(
      <TestForm
        component={() => (
          <FieldArray name="friends" component={TestComponent} />
        )}
      />
    );
  });

  /*  it('renders with render callback with array helpers as props', () => {
    render(
      <TestForm>
        {() => (
          <FieldArray
            name="friends"
          ></FieldArray>
        )}
      </TestForm>
    );
  });*/

  it('renders with "children as a function" with array helpers as props', () => {
    render(
      <TestForm>
        {() => (
          <FieldArray name="friends">
            {(arrayProps) => {
              expect(isFunction(arrayProps.push)).toBeTruthy();
              return null;
            }}
          </FieldArray>
        )}
      </TestForm>
    );
  });

  /*  it('renders with name as props', () => {
    render(
      <TestForm>
        {() => (
          <FieldArray
            name="friends"
            render={arrayProps => {
              expect(arrayProps.name).toBe('friends');
              return null;
            }}
          />
        )}
      </TestForm>
    );
  });*/

  describe('props.push()', () => {
    it('should add a value to the end of the field array', () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        arrayHelpers.push(friends[0]);
      });

      const expected = friends.concat(friends[0]);
      expect(formikBag.state.values.friends).toEqual(expected);
    });

    it('should add multiple values to the end of the field array', async () => {
      let formikBag: any;
      const newFriends = ['john', 'paul', 'george', 'ringo'];
      const addFriends = jest.fn((arrayProps: any) => {
        newFriends.forEach((value) => {
          arrayProps.push(value);
        });
      });

      const AddFriendsButton = (arrayProps: any) => {
        return (
          <button
            data-testid="add-friends-button"
            type="button"
            onClick={() => addFriends(arrayProps)}
          />
        );
      };

      const { getByTestId } = render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return <FieldArray name="friends" component={AddFriendsButton} />;
          }}
        </TestForm>
      );

      await act(() => {
        fireEvent.click(getByTestId('add-friends-button'));
      });

      expect(addFriends).toBeCalled();

      const expected = friends.concat(newFriends);
      expect(formikBag.state.values.friends).toEqual(expected);
    });

    it('should push clone not actual reference', () => {
      let personTemplate = { firstName: '', lastName: '' };
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm initialValues={{ people: [] }}>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="people">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        arrayHelpers.push(personTemplate);
      });
      expect(
        formikBag.state.values.people[formikBag.state.values.people.length - 1]
      ).not.toBe(personTemplate);
      expect(
        formikBag.state.values.people[formikBag.state.values.people.length - 1]
      ).toMatchObject(personTemplate);
    });
  });

  describe('props.pop()', () => {
    it('should remove and return the last value from the field array', async () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      let el;
      let promise: any;
      await act(() => {
        promise = arrayHelpers.pop();
      });
      await act(async () => {
        el = await promise;
      });
      expect(el).toEqual(friends[2]);

      const expected = friends.slice(0, -1);
      expect(formikBag.state.values.friends).toEqual(expected);
    });
  });

  describe('props.swap()', () => {
    it('should swap two values in field array', () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        arrayHelpers.swap(0, 2);
      });
      const expected = ['brent', 'andrea', 'jared'];
      expect(formikBag.state.values.friends).toEqual(expected);
    });
  });

  describe('props.insert()', () => {
    it('should insert a value at given index of field array', () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        arrayHelpers.insert(1, 'brian');
      });
      const expected = ['jared', 'brian', 'andrea', 'brent'];
      expect(formikBag.state.values.friends).toEqual(expected);
    });
  });

  describe('props.replace()', () => {
    it('should replace a value at given index of field array', () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        arrayHelpers.replace(1, 'brian');
      });
      const expected = ['jared', 'brian', 'brent'];
      expect(formikBag.state.values.friends).toEqual(expected);
    });
  });

  describe('props.unshift()', () => {
    it('should add a value to start of field array and return its length', async () => {
      let formikBag: any;
      let arrayHelpers: any;

      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      let length: number = 0;
      let promise: any;
      await act(() => {
        promise = arrayHelpers.unshift('brian');
      });
      await act(async () => {
        length = await promise;
      });

      const expected = ['brian', ...friends];
      expect(formikBag.state.values.friends).toEqual(expected);
      expect(length).toEqual(4);
    });
  });

  describe('props.remove()', () => {
    let formikBag: any;
    let arrayHelpers: any;

    beforeEach(() => {
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );
    });
    it('should remove a value at given index of field array', async () => {
      await act(() => {
        arrayHelpers.remove(1);
      });
      const expected = ['jared', 'brent'];
      expect(formikBag.state.values.friends).toEqual(expected);
    });

    it('should be an empty array when removing all values', async () => {
      await act(() => {
        arrayHelpers.remove(0);
        arrayHelpers.remove(0);
        arrayHelpers.remove(0);
      });
      const expected: any[] = [];

      expect(formikBag.state.values.friends).toEqual(expected);
    });
    it('should clean field from errors and touched', async () => {
      await act(() => {
        // seems weird calling 0 multiple times, but every time we call remove, the indexes get updated.
        arrayHelpers.remove(0);
        arrayHelpers.remove(0);
        arrayHelpers.remove(0);
      });

      expect(formikBag.state.errors.friends).toEqual(undefined);
      expect(formikBag.state.touched.friends).toEqual(undefined);
    });
  });

  describe('given array-like object representing errors', () => {
    it('should run arrayHelpers successfully', async () => {
      let formikBag: any;
      let arrayHelpers: any;
      render(
        <TestForm>
          {(props: any) => {
            formikBag = props;
            return (
              <FieldArray name="friends">
                {(arrayProps) => {
                  arrayHelpers = arrayProps;
                  return null;
                }}
              </FieldArray>
            );
          }}
        </TestForm>
      );

      act(() => {
        formikBag.setErrors({ friends: { 2: ['Field error'] } });
      });

      const michael = 'michael';
      const brian = 'brian';
      await act(() => {
        arrayHelpers.push(michael);
      });
      let promise: any;
      await act(() => {
        promise = arrayHelpers.pop();
      });
      let el: any;
      await act(async () => {
        el = await promise;
      });
      await act(() => {
        arrayHelpers.swap(0, 2);
      });
      await act(() => {
        arrayHelpers.insert(1, michael);
      });
      await act(() => {
        arrayHelpers.replace(1, brian);
      });
      await act(() => {
        arrayHelpers.unshift(michael);
      });
      await act(() => {
        arrayHelpers.remove(1);
      });

      expect(el).toEqual(michael);
      const finalExpected = friends
        .slice(0, -1)
        .concat(brian, michael)
        .reverse();
      expect(formikBag.state.values.friends).toEqual(finalExpected);
    });
  });
});
