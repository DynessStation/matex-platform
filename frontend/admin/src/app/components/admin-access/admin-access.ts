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
  IAdminAccess,
  IAdminAccessModel,
} from '../../shared/interface/admin-access.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import {
  DeleteAdminAccessAction,
  GetAdminAccessesAction,
  UpdateAdminAccessStatusAction,
} from '../../shared/store/action/admin-access.action';

import { AdminAccessState } from '../../shared/store/state/admin-access.state';

import { AuthState } from '../../shared/store/state/auth.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-admin-access',

  imports: [
    AsyncPipe,

    RouterModule,

    TranslateModule,

    PageWrapper,

    Table,

    HasPermissionDirective,

    ConfirmationModal,
  ],

  templateUrl: './admin-access.html',

  styleUrl: './admin-access.scss',
})
export class AdminAccess {
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

  adminAccess$: Observable<IAdminAccessModel> = this.store.select(
    AdminAccessState.adminAccesses,
  );

  authPermissions$: Observable<string[]> = this.store.select(
    AuthState.permissions,
  );

  isAllAccess$: Observable<boolean> = this.store.select(AuthState.isAllAccess);

  //==================================================
  //==== TABLE
  //==================================================

  public tableConfig: ITableConfig = this.buildTableConfig();

  //==================================================
  //==== BUILD TABLE CONFIG
  //==================================================

  private buildTableConfig(data: IAdminAccess[] = [], total = 0): ITableConfig {
    return {
      columns: [
        {
          title: 'admin_access.access_name',

          dataField: 'access_name',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'admin_access.description',

          dataField: 'access_description',
        },

        {
          title: 'admin_access.permissions',

          dataField: 'permission_count',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'admin_access.admins',

          dataField: 'admin_count',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'admin_access.status',

          dataField: 'status_label',
        },

        {
          title: 'admin_access.created',

          dataField: 'created',

          type: 'date',

          sortable: true,

          sort_direction: 'desc',
        },
      ],

      rowActions: [
        {
          label: 'admin_access.edit',

          actionToPerform: 'edit',

          icon: 'ri-pencil-line',

          permission: 'admin_access.update',
        },

        {
          label: 'admin_access.activate',

          actionToPerform: 'activate',

          icon: 'ri-checkbox-circle-line',

          permission: 'admin_access.update',

          conditional: {
            field: 'admin_access_status',

            condition: '==',

            value: '0',
          },
        },

        {
          label: 'admin_access.deactivate',

          actionToPerform: 'deactivate',

          icon: 'ri-forbid-line',

          permission: 'admin_access.update',

          conditional: {
            field: 'admin_access_status',

            condition: '==',

            value: '1',
          },
        },

        {
          label: 'admin_access.delete',

          actionToPerform: 'delete',

          icon: 'ri-delete-bin-line',

          permission: 'admin_access.delete',

          conditional: {
            field: 'admin_access_status',

            condition: '==',

            value: '0',
          },
        },
      ],

      data,

      total,
    };
  }

  //==================================================
  //==== LOCALIZE ROWS
  //==================================================

  private localizeRows(rows: IAdminAccess[]): IAdminAccess[] {
    return rows.map((item) => ({
      ...item,

      status_label:
        item.admin_access_status === 1
          ? this.translate.instant('admin_access.active')
          : this.translate.instant('admin_access.inactive'),
    }));
  }

  //==================================================
  //==== CURRENT PARAMS
  //==================================================

  private currentTableParams: Params = {};

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    //==================================================
    //==== DATA
    //==================================================

    this.adminAccess$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result.data),

          total: result.pagination.total,
        };
      });

    //==================================================
    //==== LANGUAGE
    //==================================================

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rows = (this.tableConfig.data ?? []) as IAdminAccess[];

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

    this.store.dispatch(new GetAdminAccessesAction(data));
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
        this.confirmationModal()?.openModal(
          'activate',

          action.data,

          1,
        );

        break;

      case 'deactivate':
        this.confirmationModal()?.openModal(
          'deactivate',

          action.data,

          0,
        );

        break;

      case 'delete':
        this.confirmationModal()?.openModal(
          'delete',

          action.data,
        );

        break;
    }
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    switch (action.actionToPerform) {
      case 'activate':
      case 'deactivate': {
        const status: 0 | 1 = Number(action.value) === 1 ? 1 : 0;

        this.changeStatus(
          action.data,

          status,
        );

        break;
      }

      case 'delete':
        this.delete(action.data);

        break;
    }
  }

  //==================================================
  //==== EDIT
  //==================================================

  private edit(data: IAdminAccess): void {
    void this.router.navigateByUrl(
      `/admin-access/edit/${data.id_admin_access}`,
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  private changeStatus(
    data: IAdminAccess,

    status: 0 | 1,
  ): void {
    this.store
      .dispatch(
        new UpdateAdminAccessStatusAction(
          data.id_admin_access,

          {
            admin_access_status: status,
          },
        ),
      )
      .subscribe({
        complete: () => {
          this.confirmationModal()?.closeModal();

          this.refresh();
        },
      });
  }

  //==================================================
  //==== DELETE
  //==================================================

  private delete(data: IAdminAccess): void {
    this.store
      .dispatch(new DeleteAdminAccessAction(data.id_admin_access))
      .subscribe({
        complete: () => {
          this.confirmationModal()?.closeModal();

          this.refresh();
        },
      });
  }

  //==================================================
  //==== REFRESH
  //==================================================

  private refresh(): void {
    this.store.dispatch(new GetAdminAccessesAction(this.currentTableParams));
  }
}
