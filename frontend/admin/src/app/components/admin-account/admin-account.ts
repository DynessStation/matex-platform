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
  IAdminAccount,
  IAdminAccountModel,
} from '../../shared/interface/admin-account.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import {
  DeleteAdminAccountAction,
  GetAdminAccountsAction,
  UpdateAdminAccountStatusAction,
} from '../../shared/store/action/admin-account.action';

import { AdminAccountState } from '../../shared/store/state/admin-account.state';

import { AuthState } from '../../shared/store/state/auth.state';

@Component({
  selector: 'app-admin-account',

  imports: [
    AsyncPipe,
    RouterModule,
    PageWrapper,
    TranslateModule,
    Table,
    HasPermissionDirective,
    ConfirmationModal,
  ],

  templateUrl: './admin-account.html',

  styleUrl: './admin-account.scss',
})
export class AdminAccount {
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

  adminAccount$: Observable<IAdminAccountModel> = this.store.select(
    AdminAccountState.adminAccounts,
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
    data: IAdminAccount[] = [],
    total = 0,
  ): ITableConfig {
    return {
      columns: [
        {
          title: 'admin_account.photo',

          dataField: 'profile_photo',

          type: 'image',

          class: 'tbl-image rounded-circle',

          key: 'name',
        },

        {
          title: 'admin_account.name',

          dataField: 'name',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'admin_account.alias',

          dataField: 'alias',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'admin_account.email',

          dataField: 'email_1',
        },

        {
          title: 'admin_account.phone',

          dataField: 'phone_1',
        },

        {
          title: 'admin_account.office',

          dataField: 'office_name',
        },

        {
          title: 'admin_account.position',

          dataField: 'chair_name',
        },

        {
          title: 'admin_account.access_profile',

          dataField: 'access_name',
        },

        {
          title: 'admin_account.status',

          dataField: 'status_label',
        },

        {
          title: 'admin_account.created',

          dataField: 'created',

          type: 'date',

          sortable: true,

          sort_direction: 'desc',
        },
      ],

      rowActions: [
        {
          label: 'admin_account.edit',

          actionToPerform: 'edit',

          icon: 'ri-pencil-line',

          permission: 'admin_account.update',
        },

        {
          label: 'admin_account.activate',

          actionToPerform: 'activate',

          icon: 'ri-checkbox-circle-line',

          permission: 'admin_account.update',

          conditional: {
            field: 'admin_acct_status',

            condition: '==',

            value: '0',
          },
        },

        {
          label: 'admin_account.deactivate',

          actionToPerform: 'deactivate',

          icon: 'ri-forbid-line',

          permission: 'admin_account.update',

          conditional: {
            field: 'admin_acct_status',

            condition: '==',

            value: '1',
          },
        },

        {
          label: 'admin_account.delete',

          actionToPerform: 'delete',

          icon: 'ri-delete-bin-line',

          permission: 'admin_account.delete',

          conditional: {
            field: 'admin_acct_status',

            condition: '==',

            value: '0',
          },
        },
      ],

      data,

      total,
    };
  }

  private localizeRows(rows: IAdminAccount[]): IAdminAccount[] {
    return rows.map((item) => ({
      ...item,

      status_label:
        item.admin_acct_status === 1
          ? this.translate.instant('admin_account.active')
          : this.translate.instant('admin_account.inactive'),
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
    this.adminAccount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result.data),

          total: result.pagination.total,
        };
      });

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rows = (this.tableConfig.data ?? []) as IAdminAccount[];

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

    this.store.dispatch(new GetAdminAccountsAction(data));
  }

  //==================================================
  //==== ACTION CLICK
  //==================================================

  onActionClicked(action: ITableClickedAction): void {
    switch (action.actionToPerform) {
      //==================================================
      //==== EDIT
      //==================================================

      case 'edit':
        this.edit(action.data);

        break;

      //==================================================
      //==== ACTIVATE
      //==================================================

      case 'activate':
        this.openStatusConfirmation(action.data, 1);

        break;

      //==================================================
      //==== DEACTIVATE
      //==================================================

      case 'deactivate':
        this.openStatusConfirmation(action.data, 0);

        break;

      //==================================================
      //==== DELETE
      //==================================================

      case 'delete':
        this.delete(action.data);

        break;
    }
  }

  //==================================================
  //==== OPEN STATUS CONFIRMATION
  //==================================================

  private openStatusConfirmation(
    data: IAdminAccount,

    status: 0 | 1,
  ): void {
    const action = status === 1 ? 'activate' : 'deactivate';

    this.confirmationModal()?.openModal(action, data, status);
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    if (
      action.actionToPerform !== 'activate' &&
      action.actionToPerform !== 'deactivate'
    ) {
      return;
    }

    const status: 0 | 1 = Number(action.value) === 1 ? 1 : 0;

    this.changeStatus(action.data, status);
  }

  //==================================================
  //==== CHANGE STATUS
  //==================================================

  private changeStatus(
    data: IAdminAccount,

    status: 0 | 1,
  ): void {
    this.store
      .dispatch(
        new UpdateAdminAccountStatusAction(
          data.id_admin_acct,

          {
            admin_acct_status: status,
          },
        ),
      )
      .subscribe({
        //==================================================
        //==== SUCCESS
        //==================================================

        complete: () => {
          //==================================================
          //==== CLOSE MODAL
          //==================================================

          this.confirmationModal()?.closeModal();

          //==================================================
          //==== REFRESH TABLE
          //==================================================

          this.store.dispatch(
            new GetAdminAccountsAction(this.currentTableParams),
          );
        },
      });
  }

  //==================================================
  //==== EDIT
  //==================================================

  edit(data: IAdminAccount): void {
    void this.router.navigateByUrl(`/admin-account/edit/${data.id_admin_acct}`);
  }

  //==================================================
  //==== DELETE
  //==================================================

  delete(data: IAdminAccount): void {
    this.store
      .dispatch(new DeleteAdminAccountAction(data.id_admin_acct))
      .subscribe({
        complete: () => {
          //==================================================
          //==== REFRESH TABLE
          //==================================================

          this.store.dispatch(
            new GetAdminAccountsAction(this.currentTableParams),
          );
        },
      });
  }
}
