import { Routes } from '@angular/router';

export const auth: Routes = [
  {
    path: 'login',

    loadComponent: () => import('./login/login').then((m) => m.Login),
  },

  //==================================================
  //==== PASSWORD RECOVERY
  //==================================================
  //
  // Flow sebenarnya akan dibuat
  // sebagai module tersendiri nanti.
  //

  {
    path: 'forgot-password',

    loadComponent: () =>
      import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },

  //==================================================
  //==== PARKED RECOVERY FLOW
  //==================================================

  {
    path: 'otp',

    loadComponent: () => import('./otp/otp').then((m) => m.Otp),
  },

  {
    path: 'update-password',

    loadComponent: () =>
      import('./update-password/update-password').then((m) => m.UpdatePassword),
  },
];
