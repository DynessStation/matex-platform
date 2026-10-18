import { isPlatformBrowser } from '@angular/common';

import { inject, PLATFORM_ID } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { AuthState } from '../../shared/store/state/auth.state';

import {
  hasPermissionAccess,
  PermissionMode,
} from '../../shared/utils/permission.util';

//==================================================
//==== PERMISSION GUARD
//==================================================

export const PermissionGuard: CanActivateFn = (route) => {
  //==================================================
  //==== SERVER RENDER
  //==== Permissions live in browser storage, so the server cannot see them.
  //==== Same as AuthGuard: let the browser decide; the API still enforces access.
  //==================================================

  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  //==================================================
  //==== INJECT
  //==================================================

  const store = inject(Store);

  const router = inject(Router);

  //==================================================
  //==== ROUTE PERMISSION CONFIG
  //==================================================

  const requiredPermission = route.data?.['permission'] as
    string | string[] | undefined;

  const permissionMode =
    (route.data?.['permissionMode'] as PermissionMode | undefined) ?? 'all';

  //==================================================
  //==== AUTH STATE
  //==================================================

  const permissions = store.selectSnapshot(AuthState.permissions) ?? [];

  const isAllAccess = store.selectSnapshot(AuthState.isAllAccess);

  //==================================================
  //==== CHECK ACCESS
  //==================================================

  const allowed = hasPermissionAccess(
    requiredPermission,

    permissions,

    isAllAccess,

    permissionMode,
  );

  //==================================================
  //==== ALLOWED
  //==================================================

  if (allowed) {
    return true;
  }

  //==================================================
  //==== ACCESS DENIED
  //==================================================

  return router.createUrlTree(['/dashboard']);
};
