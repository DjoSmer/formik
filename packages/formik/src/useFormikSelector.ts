import isEqual from 'react-fast-compare';
import { useFormikContext } from './FormikContext';
import { FormikState, FormikValues } from './types';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

export interface TypedUseFormikSelector<Values> {
  <TSelected>(selector: (state: FormikState<Values>) => TSelected): TSelected;
}

export function useFormikSelector<
  Values extends FormikValues = FormikValues,
  RT = unknown
>(selector: (formikState: FormikState<Values>) => RT): RT {
  const formik = useFormikContext<Values>();

  return useSyncExternalStoreWithSelector(
    formik.subscribe,
    formik.getState,
    formik.getState,
    selector,
    isEqual
  ) as RT;
}
