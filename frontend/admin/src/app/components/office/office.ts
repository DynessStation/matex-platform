import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject, viewChild } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import { ConfirmationModal } from '../../shared/components/ui/modal/confirmation-modal/confirmation-modal';

import { Table } from '../../shared/components/ui/table/table';

import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';

import { IOffice, IOfficeModel } from '../../shared/interface/office.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import {
  DeleteOfficeAction,
  GetOfficesAction,
  UpdateOfficeStatusAction,
} from '../../shared/store/action/office.action';

import { AuthState } from '../../shared/store/state/auth.state';

import { OfficeState } from '../../shared/store/state/office.state';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-office',

  imports: [
    AsyncPipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    Table,
    HasPermissionDirective,
    ConfirmationModal,
  ],

  templateUrl: './office.html',

  styleUrl: './office.scss',
})
export class Office {
  private store = inject(Store);

  private router = inject(Router);

  private destroyRef = inject(DestroyRef);

  private translate = inject(TranslateService);

  readonly confirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  office$: Observable<IOfficeModel | null> = this.store.select(
    OfficeState.offices,
  );

  authPermissions$ = this.store.select(AuthState.permissions);

  isAllAccess$ = this.store.select(AuthState.isAllAccess);

  private currentTableParams: Params = {};

  public tableConfig: ITableConfig = this.buildTableConfig();

  //==================================================
  //==== BUILD TABLE CONFIG
  //==================================================

  private buildTableConfig(
    data: IOffice[] = [],

    total = 0,
  ): ITableConfig {
    return {
      columns: [
        {
          title: 'office.code',

          dataField: 'office_code',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'office.office',

          dataField: 'office_name',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'office.city',

          dataField: 'city',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'office.admins',

          dataField: 'admin_count',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'office.media',

          dataField: 'media_count',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'office.visibility',

          dataField: 'visibility_label',
        },

        {
          title: 'office.status',

          dataField: 'status_label',
        },

        {
          title: 'office.created',

          dataField: 'created',

          type: 'date',

          sortable: true,

          sort_direction: 'desc',
        },
      ],

      rowActions: [
        {
          label: 'office.edit_action',

          actionToPerform: 'edit',

          icon: 'ri-pencil-line',

          permission: 'office.update',
        },

        {
          label: 'office.activate_action',

          actionToPerform: 'activate',

          icon: 'ri-checkbox-circle-line',

          permission: 'office.update',

          conditional: {
            field: 'status',

            condition: '==',

            value: '0',
          },
        },

        {
          label: 'office.deactivate_action',

          actionToPerform: 'deactivate',

          icon: 'ri-forbid-line',

          permission: 'office.update',

          conditional: {
            field: 'status',

            condition: '==',

            value: '1',
          },
        },

        {
          label: 'office.delete_action',

          actionToPerform: 'delete',

          icon: 'ri-delete-bin-line',

          permission: 'office.delete',

          conditional: {
            field: 'status',

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

  private localizeRows(rows: IOffice[]): IOffice[] {
    return rows.map((item) => ({
      ...item,

      status_label:
        item.status === 1
          ? this.translate.instant('office.active')
          : this.translate.instant('office.inactive'),

      visibility_label:
        item.is_public === 1
          ? this.translate.instant('office.public')
          : this.translate.instant('office.internal'),
    }));
  }

  ngOnInit(): void {
    this.office$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result?.data ?? []),

          total: result?.pagination.total ?? 0,
        };
      });

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rows = (this.tableConfig.data ?? []) as IOffice[];

        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(rows),
        };
      });
  }

  //==================================================
  //==== TABLE
  //==================================================

  onTableChange(data?: Params): void {
    this.currentTableParams = data ? { ...data } : {};

    this.store.dispatch(new GetOfficesAction(data));
  }

  //==================================================
  //==== ACTION
  //==================================================

  onActionClicked(action: ITableClickedAction): void {
    switch (action.actionToPerform) {
      case 'edit':
        void this.router.navigateByUrl(`/office/edit/${action.data.id_office}`);
        break;

      case 'activate':
        this.confirmationModal()?.openModal('activate', action.data, 1);
        break;

      case 'deactivate':
        this.confirmationModal()?.openModal('deactivate', action.data, 0);
        break;

      case 'delete':
        this.confirmationModal()?.openModal('delete', action.data);
        break;
    }
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    if (
      action.actionToPerform === 'activate' ||
      action.actionToPerform === 'deactivate'
    ) {
      const status: 0 | 1 = Number(action.value) === 1 ? 1 : 0;

      this.store
        .dispatch(
          new UpdateOfficeStatusAction(
            action.data.id_office,

            {
              status,
            },
          ),
        )
        .subscribe({
          complete: () => {
            this.confirmationModal()?.closeModal();

            this.refresh();
          },
        });

      return;
    }

    if (action.actionToPerform === 'delete') {
      this.store
        .dispatch(new DeleteOfficeAction(action.data.id_office))
        .subscribe({
          complete: () => {
            this.confirmationModal()?.closeModal();

            this.refresh();
          },
        });
    }
  }

  private refresh(): void {
    this.store.dispatch(new GetOfficesAction(this.currentTableParams));
  }
}
