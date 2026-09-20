import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap, tap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { TranslateModule } from '@ngx-translate/core';

import {
  IAdminAccountDetailResponse,
  IUpdateAdminAccount,
} from '../../../shared/interface/admin-account.interface';

import {
  EditAdminAccountAction,
  UpdateAdminAccountAction,
} from '../../../shared/store/action/admin-account.action';

import { AdminAccountState } from '../../../shared/store/state/admin-account.state';

import {
  AdminAccountFormValue,
  FormAdminAccount,
} from '../form-admin-account/form-admin-account';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

@Component({
  selector: 'app-edit-admin-account',

  imports: [
    AsyncPipe,
    PageWrapper,
    FormAdminAccount,
    TranslateModule,
    DetailErrorState,
  ],

  templateUrl: './edit-admin-account.html',

  styleUrl: './edit-admin-account.scss',
})
export class EditAdminAccount {
  //==================================================
  //==== INJECT
  //==================================================

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== DATA
  //==================================================

  public id = '';

  public detailErrorStatus: number | null = null;

  adminAccount$: Observable<IAdminAccountDetailResponse['data'] | null> =
    this.store.select(AdminAccountState.selectedAdminAccount);

  //==================================================
  //==== INIT
  //==================================================

  constructor() {
    this.route.params
      .pipe(
        tap((params) => {
          this.id = String(params['id'] ?? '').trim();

          this.detailErrorStatus = null;
        }),

        switchMap(() => this.loadDetail(this.id)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadDetail(id: string): Observable<unknown> {
    const cleanId = id.trim();

    if (!cleanId) {
      this.detailErrorStatus = 404;

      return EMPTY;
    }

    this.detailErrorStatus = null;

    return this.store.dispatch(new EditAdminAccountAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'ADMIN_ACCOUNT_INVALID_ID',
        ]);

        return EMPTY;
      }),
    );
  }

  retryDetail(): void {
    if (!this.id) {
      return;
    }

    this.loadDetail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  public submit(value: AdminAccountFormValue): void {
    if (!this.id) {
      return;
    }

    //==================================================
    //==== BUILD PAYLOAD
    //==================================================

    const payload: IUpdateAdminAccount = {
      name: value.name.trim(),

      alias: value.alias.trim(),

      email_1: value.email_1.trim().toLowerCase(),

      email_2: value.email_2?.trim()
        ? value.email_2.trim().toLowerCase()
        : null,

      phone_1: this.buildPhoneNumber(value.phone_country_1, value.phone_1),

      phone_2: value.phone_2?.trim()
        ? this.buildPhoneNumber(value.phone_country_2, value.phone_2)
        : null,

      id_profile_photo: value.id_profile_photo || null,

      id_master_comp: value.id_master_comp,

      id_office: value.id_office,

      id_chair: value.id_chair,

      id_access: value.id_access,

      is_all_access: value.is_all_access,
    };

    //==================================================
    //==== UPDATE
    //==================================================

    this.store
      .dispatch(new UpdateAdminAccountAction(payload, this.id))
      .subscribe({
        complete: () => {
          void this.router.navigateByUrl('/admin-account');
        },
      });
  }

  //==================================================
  //==== BUILD PHONE NUMBER
  //==================================================

  private buildPhoneNumber(
    countryCode: string,

    phone: string,
  ): string {
    const cleanCountryCode = String(countryCode ?? '').replace(/\D/g, '');

    const cleanPhone = String(phone ?? '').replace(/\D/g, '');

    return `+${cleanCountryCode}${cleanPhone}`;
  }
}
