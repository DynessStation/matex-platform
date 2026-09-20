import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { ICreateAdminPermission } from '../../../shared/interface/admin-permission.interface';

import { CreateAdminPermissionAction } from '../../../shared/store/action/admin-permission.action';
import { TranslateModule } from '@ngx-translate/core';

import {
  AdminPermissionFormValue,
  FormAdminPermission,
} from '../form-admin-permission/form-admin-permission';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-admin-permission',

  imports: [PageWrapper, FormAdminPermission, TranslateModule],

  templateUrl: './create-admin-permission.html',

  styleUrl: './create-admin-permission.scss',
})
export class CreateAdminPermission {
  private store = inject(Store);

  private router = inject(Router);

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(value: AdminPermissionFormValue): void {
    const payload: ICreateAdminPermission = {
      permission_key: value.permission_key,

      permission_name: value.permission_name,

      permission_group: value.permission_group || null,

      permission_description: value.permission_description || null,
    };

    this.store.dispatch(new CreateAdminPermissionAction(payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/admin-permission');
      },
    });
  }
}
