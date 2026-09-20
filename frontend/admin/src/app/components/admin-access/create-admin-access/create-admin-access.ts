import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { IAdminAccessPayload } from '../../../shared/interface/admin-access.interface';

import { CreateAdminAccessAction } from '../../../shared/store/action/admin-access.action';

import { TranslateModule } from '@ngx-translate/core';

import {
  AdminAccessFormValue,
  FormAdminAccess,
} from '../form-admin-access/form-admin-access';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-admin-access',

  imports: [PageWrapper, FormAdminAccess, TranslateModule],

  templateUrl: './create-admin-access.html',

  styleUrl: './create-admin-access.scss',
})
export class CreateAdminAccess {
  private store = inject(Store);

  private router = inject(Router);

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(value: AdminAccessFormValue): void {
    const payload: IAdminAccessPayload = {
      access_name: value.access_name,

      access_description: value.access_description || null,

      permissions: value.permissions,
    };

    this.store.dispatch(new CreateAdminAccessAction(payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/admin-access');
      },
    });
  }
}
