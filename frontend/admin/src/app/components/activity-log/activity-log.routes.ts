import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const activityLogRoutes: Routes = [
  //==================================================
  //==== DETAIL
  //==================================================

  {
    path: ':id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'audit_log.view',

      titleKey: 'activity_log_detail',
    },

    loadComponent: () =>
      import('./activity-log-detail/activity-log-detail').then(
        (m) => m.ActivityLogDetail,
      ),
  },

  //==================================================
  //==== LIST
  //==================================================

  {
    path: '',

    pathMatch: 'full',

    canActivate: [PermissionGuard],

    data: {
      permission: 'audit_log.view',

      titleKey: 'activity_log',
    },

    loadComponent: () => import('./activity-log').then((m) => m.ActivityLog),
  },
];
