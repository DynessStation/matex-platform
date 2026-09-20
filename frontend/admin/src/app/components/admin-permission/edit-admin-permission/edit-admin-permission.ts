import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap, tap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import {
  IAdminPermissionDetailResponse,
  IUpdateAdminPermission,
} from '../../../shared/interface/admin-permission.interface';

import {
  EditAdminPermissionAction,
  UpdateAdminPermissionAction,
} from '../../../shared/store/action/admin-permission.action';

import { AdminPermissionState } from '../../../shared/store/state/admin-permission.state';

import {
  AdminPermissionFormValue,
  FormAdminPermission,
} from '../form-admin-permission/form-admin-permission';
import { TranslateModule } from '@ngx-translate/core';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-edit-admin-permission',

  imports: [
    AsyncPipe,
    PageWrapper,
    FormAdminPermission,
    TranslateModule,
    DetailErrorState,
  ],

  templateUrl: './edit-admin-permission.html',

  styleUrl: './edit-admin-permission.scss',
})
export class EditAdminPermission {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  public id = '';

  public detailErrorStatus: number | null = null;

  adminPermission$: Observable<IAdminPermissionDetailResponse['data'] | null> =
    this.store.select(AdminPermissionState.selectedAdminPermission);

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

    return this.store.dispatch(new EditAdminPermissionAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'ADMIN_PERMISSION_INVALID_ID',
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

  submit(value: AdminPermissionFormValue): void {
    if (!this.id) {
      return;
    }

    const payload: IUpdateAdminPermission = {
      permission_name: value.permission_name,

      permission_group: value.permission_group || null,

      permission_description: value.permission_description || null,
    };

    this.store
      .dispatch(new UpdateAdminPermissionAction(this.id, payload))
      .subscribe({
        complete: () => {
          void this.router.navigateByUrl('/admin-permission');
        },
      });
  }
}
