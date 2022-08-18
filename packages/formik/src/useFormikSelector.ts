import isEqual from 'react-fast-compare';
import { useFormikContext } from './FormikContext';
import { FormikState } from './types';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

export type FormikSelector<Values, RT = unknown> = (
  formikState: FormikState<Values>
) => RT;

export function useFormikSelector<Values, RT = unknown>(
  selector: FormikSelector<Values, RT>
): RT {
  const formik = useFormikContext<Values>();

  return useSyncExternalStoreWithSelector(
    formik.subscribe,
    formik.getState,
    undefined,
    selector,
    isEqual
  );
}
