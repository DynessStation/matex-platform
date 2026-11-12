import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Store } from '@ngxs/store';
import { combineLatest, map } from 'rxjs';

import { AuthState } from '../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../shared/utils/permission.util';

/** Whether the signed-in account may import files and map SKUs (sales.import). */
export function canImportSales(): Signal<boolean> {
  const store = inject(Store);
  return toSignal(
    combineLatest([
      store.select(AuthState.permissions),
      store.select(AuthState.isAllAccess),
    ]).pipe(
      map(([permissions, isAllAccess]) =>
        hasPermissionAccess(
          'sales.import',
          permissions ?? [],
          isAllAccess === true,
        ),
      ),
    ),
    { initialValue: false },
  );
}
