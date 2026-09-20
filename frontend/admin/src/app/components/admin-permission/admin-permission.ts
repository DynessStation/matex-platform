import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject, viewChild } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import { ConfirmationModal } from '../../shared/components/ui/modal/confirmation-modal/confirmation-modal';

import { Table } from '../../shared/components/ui/table/table';

import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';

import {
  IAdminPermission,
  IAdminPermissionModel,
} from '../../shared/interface/admin-permission.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import {
  DeleteAdminPermissionAction,
  GetAdminPermissionsAction,
  UpdateAdminPermissionStatusAction,
} from '../../shared/store/action/admin-permission.action';

import { AdminPermissionState } from '../../shared/store/state/admin-permission.state';

import { AuthState } from '../../shared/store/state/auth.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-admin-permission',

  imports: [
    AsyncPipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    Table,
    HasPermissionDirective,
    ConfirmationModal,
  ],

  templateUrl: './admin-permission.html',

  styleUrl: './admin-permission.scss',
})
export class AdminPermission {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private router = inject(Router);

  private destroyRef = inject(DestroyRef);

  private translate = inject(TranslateService);

  //==================================================
  //==== MODAL
  //==================================================

  readonly confirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  //==================================================
  //==== STATE
  //==================================================

  adminPermission$: Observable<IAdminPermissionModel> = this.store.select(
    AdminPermissionState.adminPermissions,
  );

  authPermissions$: Observable<string[]> = this.store.select(
    AuthState.permissions,
  );

  isAllAccess$: Observable<boolean> = this.store.select(AuthState.isAllAccess);

  //==================================================
  //==== TABLE CONFIG
  //==================================================

  public tableConfig: ITableConfig = this.buildTableConfig();

  //==================================================
  //==== BUILD TABLE CONFIG
  //==================================================

  private buildTableConfig(
    data: IAdminPermission[] = [],
    total = 0,
  ): ITableConfig {
    return {
      columns: [
        {
          title: 'admin_permission.permission_key',

          dataField: 'permission_key',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'admin_permission.permission_name',

          dataField: 'permission_name',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'admin_permission.group',

          dataField: 'permission_group',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'admin_permission.access_count',

          dataField: 'access_count',
        },

        {
          title: 'admin_permission.status',

          dataField: 'status_label',
        },

        {
          title: 'admin_permission.created',

          dataField: 'created',

          type: 'date',

          sortable: true,

          sort_direction: 'desc',
        },
      ],

      rowActions: [
        {
          label: 'admin_permission.edit',

          actionToPerform: 'edit',

          icon: 'ri-pencil-line',

          permission: 'admin_permission.update',
        },

        {
          label: 'admin_permission.activate',

          actionToPerform: 'activate',

          icon: 'ri-checkbox-circle-line',

          permission: 'admin_permission.update',

          conditional: {
            field: 'permission_status',

            condition: '==',

            value: '0',
          },
        },

        {
          label: 'admin_permission.deactivate',

          actionToPerform: 'deactivate',

          icon: 'ri-forbid-line',

          permission: 'admin_permission.update',

          conditional: {
            field: 'permission_status',

            condition: '==',

            value: '1',
          },
        },

        {
          label: 'admin_permission.delete',

          actionToPerform: 'delete',

          icon: 'ri-delete-bin-line',

          permission: 'admin_permission.delete',

          conditional: {
            field: 'permission_status',

            condition: '==',

            value: '0',
          },
        },
      ],

      data,

      total,
    };
  }

  private localizeRows(rows: IAdminPermission[]): IAdminPermission[] {
    return rows.map((item) => ({
      ...item,

      status_label:
        item.permission_status === 1
          ? this.translate.instant('admin_permission.active')
          : this.translate.instant('admin_permission.inactive'),
    }));
  }

  //==================================================
  //==== CURRENT TABLE PARAMS
  //==================================================

  private currentTableParams: Params = {};

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.adminPermission$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result?.data ?? []),

          total: result?.pagination?.total ?? 0,
        };
      });

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rows = (this.tableConfig.data ?? []) as IAdminPermission[];

        const total = this.tableConfig.total ?? 0;

        this.tableConfig = this.buildTableConfig(
          this.localizeRows(rows),
          total,
        );
      });
  }

  //==================================================
  //==== TABLE CHANGE
  //==================================================

  onTableChange(data?: Params): void {
    this.currentTableParams = data
      ? {
          ...data,
        }
      : {};

    this.store.dispatch(new GetAdminPermissionsAction(data));
  }

  //==================================================
  //==== ACTION
  //==================================================

  onActionClicked(action: ITableClickedAction): void {
    switch (action.actionToPerform) {
      case 'edit':
        this.edit(action.data);

        break;

      case 'activate':
        this.openConfirmation('activate', action.data, 1);

        break;

      case 'deactivate':
        this.openConfirmation('deactivate', action.data, 0);

        break;

      case 'delete':
        this.openConfirmation('delete', action.data);

        break;
    }
  }

  //==================================================
  //==== CONFIRMATION
  //==================================================

  private openConfirmation(
    action: string,

    data: IAdminPermission,

    value?: number,
  ): void {
    this.confirmationModal()?.openModal(action, data, value);
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    switch (action.actionToPerform) {
      case 'activate':
      case 'deactivate':
        this.changeStatus(
          action.data,

          Number(action.value) === 1 ? 1 : 0,
        );

        break;

      case 'delete':
        this.delete(action.data);

        break;
    }
  }

  //==================================================
  //==== EDIT
  //==================================================

  private edit(data: IAdminPermission): void {
    void this.router.navigateByUrl(
      `/admin-permission/edit/${data.id_admin_permission}`,
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  private changeStatus(
    data: IAdminPermission,

    status: 0 | 1,
  ): void {
    this.store
      .dispatch(
        new UpdateAdminPermissionStatusAction(
          data.id_admin_permission,

          {
            permission_status: status,
          },
        ),
      )
      .subscribe({
        complete: () => {
          this.confirmationModal()?.closeModal();

          this.refreshTable();
        },
      });
  }

  //==================================================
  //==== DELETE
  //==================================================

  private delete(data: IAdminPermission): void {
    this.store
      .dispatch(new DeleteAdminPermissionAction(data.id_admin_permission))
      .subscribe({
        complete: () => {
          this.confirmationModal()?.closeModal();

          this.refreshTable();
        },
      });
  }

  //==================================================
  //==== REFRESH
  //==================================================

  private refreshTable(): void {
    this.store.dispatch(new GetAdminPermissionsAction(this.currentTableParams));
  }
}
