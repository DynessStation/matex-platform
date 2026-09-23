import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guard/permission.guard';

export const publicContactRoutes: Routes = [{
  path: '', canActivate: [PermissionGuard], data: { permission: 'public_contact.view' },
  loadComponent: () => import('./public-contact').then(component => component.PublicContact),
}];
