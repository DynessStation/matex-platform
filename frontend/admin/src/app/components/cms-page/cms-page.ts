import { AsyncPipe, isPlatformBrowser } from '@angular/common';

import {
  AfterViewInit,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  viewChild,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Select2Data, Select2Module } from 'ng-select2-component';

import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import { Table } from '../../shared/components/ui/table/table';

import {
  ICmsPage,
  ICmsPageModel,
} from '../../shared/interface/cms-page.interface';

import { Params } from '../../shared/interface/core.interface';

import { ITableConfig } from '../../shared/interface/table.interface';

import { LocalizationService } from '../../shared/services/localization.service';

import { GetCmsPagesAction } from '../../shared/store/action/cms-page.action';

import { AuthState } from '../../shared/store/state/auth.state';

import { CmsPageState } from '../../shared/store/state/cms-page.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-cms-page',

  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    TranslateModule,
    Select2Module,
    PageWrapper,
    Table,
  ],

  templateUrl: './cms-page.html',
})
export class CmsPage implements AfterViewInit {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private formBuilder = inject(FormBuilder);

  private destroyRef = inject(DestroyRef);

  private platformId = inject(PLATFORM_ID);

  private router = inject(Router);

  private activatedRoute = inject(ActivatedRoute);

  private translate = inject(TranslateService);

  private localization = inject(LocalizationService);

  //==================================================
  //==== STATE
  //==================================================

  cmsPages$: Observable<ICmsPageModel | null> = this.store.select(
    CmsPageState.cmsPages,
  );

  authPermissions$ = this.store.select(AuthState.permissions);

  isAllAccess$ = this.store.select(AuthState.isAllAccess);

  //==================================================
  //==== VIEW STATE
  //==================================================

  public isBrowser = isPlatformBrowser(this.platformId);

  public openFilterPanel = false;

  private requestLocale = this.localization.locale();

  //==================================================
  //==== TABLE REF
  //==================================================

  readonly table = viewChild(Table);

  private pendingTableState: Params | null = null;

  //==================================================
  //==== FILTER OPTIONS
  //==================================================

  public statuses: Select2Data = [];

  public visibilities: Select2Data = [];

  //==================================================
  //==== FILTER FORM
  //==================================================

  public filterForm = this.formBuilder.nonNullable.group({
    status: [''],

    visibility: [''],

    type: [''],
  });

  //==================================================
  //==== TABLE STATE
  //==================================================

  private currentTableParams: Params = {};

  private activeFilters: Record<string, string> = {};

  //==================================================
  //==== TABLE CONFIG
  //==================================================

  public tableConfig: ITableConfig = {
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
        title: 'cms_page.type',

        dataField: 'type_label',
      },

      {
        title: 'cms_page.status',

        dataField: 'effective_status_label',
      },

      {
        title: 'cms_page.visibility',

        dataField: 'visibility_label',
      },

      {
        title: 'cms_page.translations',

        dataField: 'translation_label',
      },

      {
        title: 'cms_page.updated',

        dataField: 'updated',

        type: 'date',

        sortable: true,

        sort_direction: 'desc',
      },
    ],

    data: [],

    total: 0,
  };

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.buildFilterOptions();

    //==================================================
    //==== STORE RESULT
    //==================================================

    this.cmsPages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: this.localizeRows(result?.data ?? []),

          total: result?.pagination?.total ?? 0,
        };
      });

    //==================================================
    //==== LANGUAGE CHANGE
    //==================================================

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.requestLocale = event.lang === 'en' ? 'en-US' : 'id-ID';

        this.buildFilterOptions();

        this.fetchCmsPages();
      });

    //==================================================
    //==== URL STATE
    //==================================================

    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.restoreFromUrl(params);
      });
  }

  //==================================================
  //==== AFTER VIEW INIT
  //==================================================

  ngAfterViewInit(): void {
    if (!this.pendingTableState) {
      return;
    }

    this.table()?.syncState(this.pendingTableState);

    this.pendingTableState = null;
  }

  //==================================================
  //==== FILTER OPTIONS
  //==================================================

  private buildFilterOptions(): void {
    this.statuses = [
      {
        value: '0',

        label: this.translate.instant('cms_page.status_draft'),
      },

      {
        value: '1',

        label: this.translate.instant('cms_page.status_published'),
      },

      {
        value: '2',

        label: this.translate.instant('cms_page.status_archived'),
      },
    ];

    this.visibilities = [
      {
        value: '0',

        label: this.translate.instant('cms_page.visibility_private'),
      },

      {
        value: '1',

        label: this.translate.instant('cms_page.visibility_public'),
      },

      {
        value: '2',

        label: this.translate.instant('cms_page.visibility_unlisted'),
      },
    ];
  }

  //==================================================
  //==== LOCALIZE ROWS
  //==================================================

  private localizeRows(rows: ICmsPage[]): ICmsPage[] {
    return rows.map((item) => {
      const visibilityKey =
        item.cms_page_visibility === 0
          ? 'private'
          : item.cms_page_visibility === 2
            ? 'unlisted'
            : 'public';

      return {
        ...item,

        type_label: this.humanize(item.cms_page_type),

        effective_status_label: this.translate.instant(
          `cms_page.status_${item.effective_status}`,
        ),

        visibility_label: this.translate.instant(
          `cms_page.visibility_${visibilityKey}`,
        ),

        translation_label: this.translate.instant(
          'cms_page.translation_summary',
          {
            published: item.published_translation_count,

            total: item.translation_count,
          },
        ),
      } as ICmsPage;
    });
  }

  //==================================================
  //==== HUMANIZE
  //==================================================

  private humanize(value: string): string {
    if (!value) {
      return '-';
    }

    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  //==================================================
  //==== FILTER TOGGLE
  //==================================================

  openFilter(): void {
    this.openFilterPanel = !this.openFilterPanel;
  }

  //==================================================
  //==== RESTORE URL STATE
  //==================================================

  private restoreFromUrl(params: ParamMap): void {
    const tableState: Params = {
      page: this.parsePositiveNumber(params.get('page'), 1),

      paginate: this.parsePageSize(params.get('paginate')),

      search: params.get('search')?.trim() ?? '',

      field: params.get('field')?.trim() ?? '',

      sort:
        params.get('sort') === 'asc' || params.get('sort') === 'desc'
          ? params.get('sort')
          : '',
    };

    //==================================================
    //==== FILTERS
    //==================================================

    const rawStatus = params.get('status') ?? '';

    const rawVisibility = params.get('visibility') ?? '';

    const rawType = params.get('type')?.trim().toLowerCase() ?? '';

    const filterValues = {
      status: ['0', '1', '2'].includes(rawStatus) ? rawStatus : '',

      visibility: ['0', '1', '2'].includes(rawVisibility) ? rawVisibility : '',

      type: /^[a-z0-9][a-z0-9_-]*$/.test(rawType) ? rawType : '',
    };

    this.activeFilters = {};

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== '') {
        this.activeFilters[key] = value;
      }
    });

    this.filterForm.patchValue(filterValues, {
      emitEvent: false,
    });

    if (Object.keys(this.activeFilters).length) {
      this.openFilterPanel = true;
    }

    //==================================================
    //==== TABLE VISUAL STATE
    //==================================================

    const table = this.table();

    if (table) {
      table.syncState(tableState);
    } else {
      this.pendingTableState = tableState;
    }

    //==================================================
    //==== API STATE
    //==================================================

    this.currentTableParams = {
      ...tableState,
    };

    //==================================================
    //==== FETCH — ONLY HERE
    //==================================================

    this.fetchCmsPages();
  }

  //==================================================
  //==== APPLY FILTER
  //==================================================

  applyFilters(): void {
    const value = this.filterForm.getRawValue();

    this.activeFilters = {};

    const status = this.normalizeFilterValue(value.status);

    const visibility = this.normalizeFilterValue(value.visibility);

    const type = this.normalizeFilterValue(value.type).toLowerCase();

    if (status !== '') {
      this.activeFilters['status'] = status;
    }

    if (visibility !== '') {
      this.activeFilters['visibility'] = visibility;
    }

    if (type) {
      this.activeFilters['type'] = type;
    }

    this.table()?.onChangeTable(1, 'page');
  }

  //==================================================
  //==== RESET FILTER
  //==================================================

  resetFilters(): void {
    this.filterForm.reset({
      status: '',

      visibility: '',

      type: '',
    });

    this.activeFilters = {};

    this.table()?.onChangeTable(1, 'page');
  }

  //==================================================
  //==== TABLE CHANGE
  //==================================================

  onTableChange(data?: Params): void {
    const state: Params = {
      ...(data ?? {}),

      ...this.activeFilters,
    };

    this.updateUrl(state);
  }

  //==================================================
  //==== FETCH
  //==================================================

  private fetchCmsPages(): void {
    this.store.dispatch(
      new GetCmsPagesAction({
        ...this.currentTableParams,

        ...this.activeFilters,

        locale: this.requestLocale,
      }),
    );
  }

  //==================================================
  //==== UPDATE URL
  //==================================================

  private updateUrl(state: Params): void {
    const queryParams = this.buildQueryParams(state);

    const currentSearch =
      this.activatedRoute.snapshot.queryParamMap.get('search') ?? '';

    const nextSearch = String(queryParams['search'] ?? '');

    const replaceUrl = currentSearch !== nextSearch;

    void this.router.navigate([], {
      relativeTo: this.activatedRoute,

      queryParams,

      replaceUrl,
    });
  }

  //==================================================
  //==== BUILD QUERY PARAMS
  //==================================================

  private buildQueryParams(state: Params): Params {
    const query: Params = {};

    const page = Number(state['page'] ?? 1);

    if (page > 1) {
      query['page'] = page;
    }

    const paginate = Number(state['paginate'] ?? 15);

    if (paginate !== 15) {
      query['paginate'] = paginate;
    }

    const keys = ['search', 'field', 'sort', 'status', 'visibility', 'type'];

    keys.forEach((key) => {
      const value = this.normalizeFilterValue(state[key]);

      if (value !== '' && !value.includes('undefined')) {
        query[key] = value;
      }
    });

    return query;
  }

  //==================================================
  //==== HELPERS
  //==================================================

  private normalizeFilterValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim();
    }

    return '';
  }

  private parsePositiveNumber(
    value: string | null,

    fallback: number,
  ): number {
    const result = Number(value);

    return Number.isInteger(result) && result > 0 ? result : fallback;
  }

  private parsePageSize(value: string | null): number {
    const result = Number(value);

    return [15, 25, 50, 100].includes(result) ? result : 15;
  }
}
