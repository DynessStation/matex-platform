import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap, tap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { TranslateModule } from '@ngx-translate/core';

import {
  IAdminAccessDetail,
  IAdminAccessPayload,
} from '../../../shared/interface/admin-access.interface';

import {
  GetAdminAccessDetailAction,
  UpdateAdminAccessAction,
} from '../../../shared/store/action/admin-access.action';

import { AdminAccessState } from '../../../shared/store/state/admin-access.state';

import {
  AdminAccessFormValue,
  FormAdminAccess,
} from '../form-admin-access/form-admin-access';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-edit-admin-access',

  imports: [
    AsyncPipe,
    PageWrapper,
    FormAdminAccess,
    TranslateModule,
    DetailErrorState,
  ],

  templateUrl: './edit-admin-access.html',

  styleUrl: './edit-admin-access.scss',
})
export class EditAdminAccess {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== DATA
  //==================================================

  public id = '';

  public detailErrorStatus: number | null = null;

  adminAccess$: Observable<IAdminAccessDetail | null> = this.store.select(
    AdminAccessState.selectedAdminAccess,
  );

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

    return this.store.dispatch(new GetAdminAccessDetailAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'ADMIN_ACCESS_INVALID_ID',
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

  submit(value: AdminAccessFormValue): void {
    if (!this.id) {
      return;
    }

    const payload: IAdminAccessPayload = {
      access_name: value.access_name,

      access_description: value.access_description || null,

      permissions: value.permissions,
    };

    this.store
      .dispatch(
        new UpdateAdminAccessAction(
          this.id,

          payload,
        ),
      )
      .subscribe({
        complete: () => {
          void this.router.navigateByUrl('/admin-access');
        },
      });
  }
}
