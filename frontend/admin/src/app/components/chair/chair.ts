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

import { IChair, IChairModel } from '../../shared/interface/chair.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import {
  DeleteChairAction,
  GetChairsAction,
  UpdateChairStatusAction,
} from '../../shared/store/action/chair.action';

import { AuthState } from '../../shared/store/state/auth.state';

import { ChairState } from '../../shared/store/state/chair.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-chair',

  imports: [
    AsyncPipe,

    RouterModule,

    TranslateModule,

    PageWrapper,

    Table,

    HasPermissionDirective,

    ConfirmationModal,
  ],

  templateUrl: './chair.html',

  styleUrl: './chair.scss',
})
export class Chair {
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

  chair$: Observable<IChairModel> = this.store.select(ChairState.chairs);

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

  private buildTableConfig(data: IChair[] = [], total = 0): ITableConfig {
    return {
      columns: [
        {
          title: 'chair.position',

          dataField: 'chair_name',

          sortable: true,

          sort_direction: 'asc',
        },

        {
          title: 'chair.description',

          dataField: 'chair_description',
        },

        {
          title: 'chair.admins',

          dataField: 'admin_count',

          sortable: true,

          sort_direction: 'desc',
        },

        {
          title: 'chair.status',

          dataField: 'status_label',
        },

        {
          title: 'chair.created',

          dataField: 'created',

          type: 'date',

          sortable: true,

          sort_direction: 'desc',
        },
      ],

      rowActions: [
        {
          label: 'chair.edit',

          actionToPerform: 'edit',

          icon: 'ri-pencil-line',

          permission: 'chair.update',
        },

        {
          label: 'chair.activate',

          actionToPerform: 'activate',

          icon: 'ri-checkbox-circle-line',

          permission: 'chair.update',

          conditional: {
            field: 'chair_status',

            condition: '==',

            value: '0',
          },
        },

        {
          label: 'chair.deactivate',

          actionToPerform: 'deactivate',

          icon: 'ri-forbid-line',

          permission: 'chair.update',

          conditional: {
            field: 'chair_status',

            condition: '==',

            value: '1',
          },
        },

        {
          label: 'chair.delete',

          actionToPerform: 'delete',

          icon: 'ri-delete-bin-line',

          permission: 'chair.delete',

          conditional: {
            field: 'chair_status',

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

  private localizeRows(rows: IChair[]): IChair[] {
    return rows.map((item) => ({
      ...item,

      status_label:
        item.chair_status === 1
          ? this.translate.instant('chair.active')
          : this.translate.instant('chair.inactive'),
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

    this.chair$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result.data),

          total: result.pagination.total,
        };
      });

    //==================================================
    //==== LANGUAGE CHANGE
    //==================================================

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rows = (this.tableConfig.data ?? []) as IChair[];

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

    this.store.dispatch(new GetChairsAction(data));
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

  private edit(data: IChair): void {
    void this.router.navigateByUrl(`/chair/edit/${data.id_chair}`);
  }

  //==================================================
  //==== STATUS
  //==================================================

  private changeStatus(
    data: IChair,

    status: 0 | 1,
  ): void {
    this.store
      .dispatch(
        new UpdateChairStatusAction(
          data.id_chair,

          {
            chair_status: status,
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

  private delete(data: IChair): void {
    this.store.dispatch(new DeleteChairAction(data.id_chair)).subscribe({
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
    this.store.dispatch(new GetChairsAction(this.currentTableParams));
  }
}
