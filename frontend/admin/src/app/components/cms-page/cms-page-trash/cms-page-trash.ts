import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject, viewChild } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { ConfirmationModal } from '../../../shared/components/ui/modal/confirmation-modal/confirmation-modal';

import { Table } from '../../../shared/components/ui/table/table';

import {
  ICmsPageTrash,
  ICmsPageTrashModel,
} from '../../../shared/interface/cms-page.interface';

import { Params } from '../../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../../shared/interface/table.interface';

import { LocalizationService } from '../../../shared/services/localization.service';

import {
  GetCmsPageTrashAction,
  RestoreCmsPageAction,
} from '../../../shared/store/action/cms-page.action';

import { AuthState } from '../../../shared/store/state/auth.state';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-cms-page-trash',

  imports: [
    AsyncPipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    Table,
    ConfirmationModal,
  ],

  templateUrl: './cms-page-trash.html',
})
export class CmsPageTrash {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  private translate = inject(TranslateService);

  private localization = inject(LocalizationService);

  //==================================================
  //==== STATE
  //==================================================

  trash$: Observable<ICmsPageTrashModel | null> = this.store.select(
    CmsPageState.trash,
  );

  authPermissions$ = this.store.select(AuthState.permissions);

  isAllAccess$ = this.store.select(AuthState.isAllAccess);

  private requestLocale = this.localization.locale();

  private currentTableParams: Params = {};

  public restoring = false;

  //==================================================
  //==== MODAL
  //==================================================

  readonly confirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  //==================================================
  //==== TABLE
  //==================================================

  public tableConfig: ITableConfig<ICmsPageTrash> = {
    columns: [
      {
        title: 'cms_page.page_title',

        dataField: 'cms_page_title',

        sortable: true,

        sort_direction: 'asc',
      },

      {
        title: 'cms_page.key',

        dataField: 'cms_page_key',

        sortable: true,

        sort_direction: 'asc',
      },

      {
        title: 'cms_page.status',

        dataField: 'effective_status_label',
      },

      {
        title: 'cms_page.translations',

        dataField: 'translation_label',
      },

      {
        title: 'cms_page.deleted_at',

        dataField: 'cms_page_deleted_at',

        type: 'date',

        sortable: true,

        sort_direction: 'desc',
      },
    ],

    rowActions: [
      {
        label: 'cms_page.restore_action',

        actionToPerform: 'restore',

        icon: 'ri-arrow-go-back-line',

        permission: 'cms_page.delete',
      },
    ],

    data: [],

    total: 0,
  };

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.trash$
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
      .subscribe((event) => {
        this.requestLocale = event.lang === 'en' ? 'en-US' : 'id-ID';

        this.fetchTrash();
      });
  }

  //==================================================
  //==== LOCALIZE ROWS
  //==================================================

  private localizeRows(rows: ICmsPageTrash[]): ICmsPageTrash[] {
    return rows.map((item) => ({
      ...item,

      effective_status_label: this.translate.instant(
        `cms_page.status_${item.effective_status}`,
      ),

      translation_label: this.translate.instant(
        'cms_page.translation_summary',
        {
          published: item.published_translation_count,

          total: item.translation_count,
        },
      ),
    })) as ICmsPageTrash[];
  }

  //==================================================
  //==== TABLE CHANGE
  //==================================================

  onTableChange(data?: Params): void {
    this.currentTableParams = {
      ...(data ?? {}),
    };

    this.fetchTrash();
  }

  //==================================================
  //==== FETCH
  //==================================================

  private fetchTrash(): void {
    this.store.dispatch(
      new GetCmsPageTrashAction({
        ...this.currentTableParams,

        locale: this.requestLocale,
      }),
    );
  }

  //==================================================
  //==== ACTION
  //==================================================

  onActionClicked(action: ITableClickedAction): void {
    if (action.actionToPerform !== 'restore') {
      return;
    }

    const page = action.data as ICmsPageTrash;

    if (!page?.id_cms_page) {
      return;
    }

    this.confirmationModal()?.openModal('restore', {
      ...page,

      name: page.cms_page_title?.trim() || page.cms_page_key,
    });
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    if (action.actionToPerform !== 'restore' || this.restoring) {
      return;
    }

    const page = action.data as ICmsPageTrash;

    if (!page?.id_cms_page) {
      return;
    }

    this.restoring = true;

    this.store
      .dispatch(new RestoreCmsPageAction(page.id_cms_page))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.restoring = false;

          this.confirmationModal()?.closeModal();

          this.fetchTrash();
        },

        error: () => {
          this.restoring = false;
        },
      });
  }
}
