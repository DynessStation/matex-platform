import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { CreateAdminAccountAction } from '../../../shared/store/action/admin-account.action';

import { TranslateModule } from '@ngx-translate/core';

import {
  AdminAccountFormValue,
  FormAdminAccount,
} from '../form-admin-account/form-admin-account';

@Component({
  selector: 'app-create-admin-account',

  imports: [PageWrapper, FormAdminAccount, TranslateModule],

  templateUrl: './create-admin-account.html',
  styleUrl: './create-admin-account.scss',
})
export class CreateAdminAccount {
  private store = inject(Store);

  private router = inject(Router);

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(data: AdminAccountFormValue): void {
    const payload = {
      name: data.name,

      alias: data.alias,

      email_1: data.email_1,

      email_2: data.email_2 || null,

      phone_1: `+${data.phone_country_1}${data.phone_1}`,

      phone_2: data.phone_2 ? `+${data.phone_country_2}${data.phone_2}` : null,

      id_profile_photo: data.id_profile_photo || null,

      id_master_comp: data.id_master_comp,

      id_office: data.id_office,

      id_chair: data.id_chair,

      id_access: data.id_access,

      is_all_access: data.is_all_access,

      password: data.password,
    };

    this.store.dispatch(new CreateAdminAccountAction(payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/admin-account');
      },
    });
  }
}
