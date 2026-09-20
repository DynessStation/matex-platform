import { isPlatformBrowser, AsyncPipe } from '@angular/common';

import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { Select2Data, Select2Module } from 'ng-select2-component';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import { Table } from '../../shared/components/ui/table/table';

import {
  IAuditLog,
  IAuditLogModel,
} from '../../shared/interface/audit-log.interface';

import { Params } from '../../shared/interface/core.interface';

import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';

import { GetAuditLogsAction } from '../../shared/store/action/audit-log.action';

import { AuditLogState } from '../../shared/store/state/audit-log.state';

import { AuthState } from '../../shared/store/state/auth.state';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-activity-log',

  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    TranslateModule,
    Select2Module,
    PageWrapper,
    Table,
  ],

  templateUrl: './activity-log.html',

  styleUrl: './activity-log.scss',
})
export class ActivityLog implements AfterViewInit {
  //==================================================
  //==== INJECT
  //==================================================
  private formBuilder = inject(FormBuilder);
  private store = inject(Store);

  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  private translate = inject(TranslateService);
  private activatedRoute = inject(ActivatedRoute);
  //==================================================
  //==== STATE
  //==================================================

  authPermissions$ = this.store.select(AuthState.permissions);

  isAllAccess$ = this.store.select(AuthState.isAllAccess);

  //==================================================
  //==== URL STATE
  //==================================================

  private pendingTableState: Params | null = null;

  //==================================================
  //==== VIEW STATE
  //==================================================

  public isBrowser = isPlatformBrowser(this.platformId);

  public openFilterPanel = false;

  //==================================================
  //==== FILTER TOGGLE
  //==================================================

  openFilter(): void {
    this.openFilterPanel = !this.openFilterPanel;
  }

  auditLog$: Observable<IAuditLogModel | null> = this.store.select(
    AuditLogState.auditLogs,
  );

  //==================================================
  //==== TABLE CONFIG
  //==================================================

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'audit_created',
        dataField: 'created',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },

      {
        title: 'audit_event',
        dataField: 'event_code',
      },

      {
        title: 'audit_actor',
        dataField: 'actor.label',
      },

      {
        title: 'audit_entity',
        dataField: 'entity.label',
      },

      {
        title: 'audit_module',
        dataField: 'module',
      },

      {
        title: 'audit_category',
        dataField: 'category',
      },

      {
        title: 'audit_outcome',
        dataField: 'outcome',
      },

      {
        title: 'audit_method',
        dataField: 'http.method',
      },

      {
        title: 'audit_http_status',
        dataField: 'http.status',
      },
    ],
    rowActions: [
      {
        label: 'audit_view',

        actionToPerform: 'view',

        icon: 'ri-eye-line',

        permission: 'audit_log.view',
      },
    ],

    data: [] as IAuditLog[],

    total: 0,
  };

  //==================================================
  //==== TABLE REF
  //==================================================

  readonly table = viewChild(Table);

  //==================================================
  //==== FILTER OPTIONS
  //==================================================

  public categories: Select2Data = [];

  public outcomes: Select2Data = [];

  public sources: Select2Data = [];

  //==================================================
  //==== BUILD FILTER OPTIONS
  //==================================================

  private buildFilterOptions(): void {
    this.categories = [
      {
        value: 'data_change',
        label: this.translate.instant('audit_category_data_change'),
      },
      {
        value: 'security',
        label: this.translate.instant('audit_category_security'),
      },
      {
        value: 'access_control',
        label: this.translate.instant('audit_category_access_control'),
      },
      {
        value: 'file',
        label: this.translate.instant('audit_category_file'),
      },
      {
        value: 'system',
        label: this.translate.instant('audit_category_system'),
      },
      {
        value: 'business',
        label: this.translate.instant('audit_category_business'),
      },
      {
        value: 'integration',
        label: this.translate.instant('audit_category_integration'),
      },
    ];

    this.outcomes = [
      {
        value: 'success',
        label: this.translate.instant('audit_outcome_success'),
      },
      {
        value: 'failure',
        label: this.translate.instant('audit_outcome_failure'),
      },
      {
        value: 'denied',
        label: this.translate.instant('audit_outcome_denied'),
      },
    ];

    this.sources = [
      {
        value: 'admin_web',
        label: this.translate.instant('audit_source_admin_web'),
      },
      {
        value: 'public_web',
        label: this.translate.instant('audit_source_public_web'),
      },
      {
        value: 'api',
        label: this.translate.instant('audit_source_api'),
      },
      {
        value: 'system',
        label: this.translate.instant('audit_source_system'),
      },
      {
        value: 'job',
        label: this.translate.instant('audit_source_job'),
      },
      {
        value: 'integration',
        label: this.translate.instant('audit_source_integration'),
      },
    ];
  }

  //==================================================
  //==== FILTER FORM
  //==================================================

  public filterForm = this.formBuilder.nonNullable.group({
    category: [''],

    outcome: [''],

    source: [''],

    module: [''],

    action: [''],

    event_code: [''],
  });

  //==================================================
  //==== CURRENT PARAMS
  //==================================================

  private currentTableParams: Params = {};

  private activeFilters: Record<string, string> = {};

  private activeDateFilters: Record<string, string> = {};

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.buildFilterOptions();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.buildFilterOptions();
      });

    this.auditLog$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.tableConfig = {
          ...this.tableConfig,

          data: result?.data ?? [],

          total: result?.pagination?.total ?? 0,
        };
      });

    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.restoreFromUrl(params);
      });
  }

  ngAfterViewInit(): void {
    if (!this.pendingTableState) {
      return;
    }

    this.table()?.syncState(this.pendingTableState);

    this.pendingTableState = null;
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
    //==== DATE
    //==================================================

    const startDate = this.normalizeDateQuery(params.get('start_date'));

    const endDate = this.normalizeDateQuery(params.get('end_date'));

    if (startDate) {
      tableState['start_date'] = startDate;
    }

    if (endDate) {
      tableState['end_date'] = endDate;
    }

    //==================================================
    //==== ADVANCED FILTERS
    //==================================================

    this.activeFilters = {};

    const filterValues = {
      category: params.get('category')?.trim() ?? '',

      outcome: params.get('outcome')?.trim() ?? '',

      source: params.get('source')?.trim() ?? '',

      module: params.get('module')?.trim() ?? '',

      action: params.get('action')?.trim() ?? '',

      event_code: params.get('event_code')?.trim() ?? '',
    };

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        this.activeFilters[key] = value;
      }
    });

    this.filterForm.patchValue(filterValues, {
      emitEvent: false,
    });

    //==================================================
    //==== FILTER PANEL
    //==================================================

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

    const apiTableState: Params = {
      ...tableState,
    };

    delete apiTableState['start_date'];

    delete apiTableState['end_date'];

    this.currentTableParams = apiTableState;

    this.activeDateFilters = {};

    if (startDate) {
      const dateFrom = this.toAuditDateBoundary(startDate, false);

      if (dateFrom) {
        this.activeDateFilters['date_from'] = dateFrom;
      }
    }

    if (endDate) {
      const dateTo = this.toAuditDateBoundary(endDate, true);

      if (dateTo) {
        this.activeDateFilters['date_to'] = dateTo;
      }
    }

    //==================================================
    //==== FETCH — ONLY HERE
    //==================================================

    this.fetchAuditLogs();
  }

  //==================================================
  //==== PARSE POSITIVE NUMBER
  //==================================================

  private parsePositiveNumber(
    value: string | null,

    fallback: number,
  ): number {
    const result = Number(value);

    return Number.isInteger(result) && result > 0 ? result : fallback;
  }

  //==================================================
  //==== PAGE SIZE
  //==================================================

  private parsePageSize(value: string | null): number {
    const result = Number(value);

    return [15, 25, 50, 100].includes(result) ? result : 15;
  }

  //==================================================
  //==== DATE QUERY
  //==================================================

  private normalizeDateQuery(value: string | null): string | null {
    if (!value || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      return null;
    }

    return value;
  }

  //==================================================
  //==== APPLY FILTER
  //==================================================

  applyFilters(): void {
    const value = this.filterForm.getRawValue();

    this.activeFilters = {};

    //==================================================
    //==== STRING FILTERS
    //==================================================

    const stringFilters = [
      'category',
      'outcome',
      'source',
      'module',
      'action',
      'event_code',
    ] as const;

    stringFilters.forEach((key) => {
      const clean = this.normalizeFilterValue(value[key]);

      if (clean) {
        this.activeFilters[key] = clean;
      }
    });

    //==================================================
    //==== RETURN TO PAGE 1
    //==================================================

    this.table()?.onChangeTable(1, 'page');
  }

  //==================================================
  //==== NORMALIZE FILTER VALUE
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

  //==================================================
  //==== RESET FILTER
  //==================================================

  resetFilters(): void {
    this.filterForm.reset({
      category: '',

      outcome: '',

      source: '',

      module: '',

      action: '',

      event_code: '',
    });

    this.activeFilters = {};

    this.activeDateFilters = {};

    const table = this.table();

    if (!table) {
      return;
    }

    table.fromDate = null;

    table.toDate = null;

    delete table.tableData['start_date'];

    delete table.tableData['end_date'];

    table.onChangeTable(1, 'page');
  }
  //==================================================
  //==== FETCH
  //==================================================

  private fetchAuditLogs(): void {
    const payload = {
      ...this.currentTableParams,

      ...this.activeFilters,

      ...this.activeDateFilters,
    };

    this.store.dispatch(new GetAuditLogsAction(payload));
  }

  private toAuditDateBoundary(
    value: unknown,

    endOfDay: boolean,
  ): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const parts = value.split('-').map(Number);

    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    const [year, month, day] = parts;

    const date = new Date(
      year,
      month - 1,
      day,

      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
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
  //==== UPDATE URL
  //==================================================

  private updateUrl(state: Params): void {
    const queryParams = this.buildQueryParams(state);

    const currentSearch =
      this.activatedRoute.snapshot.queryParamMap.get('search') ?? '';

    const nextSearch = String(queryParams['search'] ?? '');

    // Search typing tidak bikin puluhan browser-history entries.
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

    //==================================================
    //==== PAGE
    //==================================================

    const page = Number(state['page'] ?? 1);

    if (page > 1) {
      query['page'] = page;
    }

    //==================================================
    //==== PAGINATE
    //==================================================

    const paginate = Number(state['paginate'] ?? 15);

    if (paginate !== 15) {
      query['paginate'] = paginate;
    }

    //==================================================
    //==== STRING PARAMS
    //==================================================

    const stringKeys = [
      'search',
      'field',
      'sort',
      'start_date',
      'end_date',
      'category',
      'outcome',
      'source',
      'module',
      'action',
      'event_code',
    ];

    stringKeys.forEach((key) => {
      const value = this.normalizeFilterValue(state[key]);

      if (value && !value.includes('undefined')) {
        query[key] = value;
      }
    });

    return query;
  }

  //==================================================
  //==== ACTION
  //==================================================

  onActionClicked(action: ITableClickedAction): void {
    if (action.actionToPerform === 'view') {
      this.view(action.data as IAuditLog);
    }
  }

  //==================================================
  //==== VIEW DETAIL
  //==================================================

  view(data: IAuditLog): void {
    if (!data?.id_audit_log) {
      return;
    }

    void this.router.navigateByUrl(`/activity-log/${data.id_audit_log}`);
  }
}
