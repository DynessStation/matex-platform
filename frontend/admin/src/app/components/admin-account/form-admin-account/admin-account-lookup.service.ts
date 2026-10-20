import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Select2Data,
  Select2ScrollEvent,
  Select2SearchEvent,
} from 'ng-select2-component';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';

import {
  ADMIN_LOOKUP_LIMIT,
  AdminAccountFormMode,
  AdminLookupSearch,
  AdminLookupState,
  AdminLookupType,
  emptyLookupState,
} from './form-admin-account.model';
import {
  emptyLookupResponse,
  mergeLookupOptions,
} from './form-admin-account.util';
import { IAdminAccountSelectResponse } from '../../../shared/interface/admin-account.interface';
import { AdminAccountService } from '../../../shared/services/admin-account.service';

// Paged, searchable Select2 lookups (company, office, chair, access) of the admin account
// form. Provided by FormAdminAccount next to AdminAccountFormService, which connects it.
@Injectable()
export class AdminAccountLookupService {
  //==================================================
  //==== INJECT
  //==================================================

  private destroyRef = inject(DestroyRef);

  private adminAccountService = inject(AdminAccountService);

  //==================================================
  //==== FORM BINDING
  //==================================================

  // Bound to the form in connect().
  private mode: Signal<AdminAccountFormMode> = signal('create');

  private companyId: () => string = () => '';

  connect(form: {
    mode: Signal<AdminAccountFormMode>;
    companyId: () => string;
  }): void {
    this.mode = form.mode;
    this.companyId = form.companyId;
  }

  //==================================================
  //==== OPTIONS
  //==================================================

  public companyOptions: Select2Data = [];

  public officeOptions: Select2Data = [];

  public chairOptions: Select2Data = [];

  public accessOptions: Select2Data = [];

  //==================================================
  //==== STATE
  //==================================================

  private lookupSearch$ = new Subject<AdminLookupSearch>();

  private lookupState: Record<AdminLookupType, AdminLookupState> = {
    company: emptyLookupState(),

    office: emptyLookupState(),

    chair: emptyLookupState(),

    access: emptyLookupState(),
  };

  constructor() {
    this.initializeLookupSearch();
  }

  //==================================================
  //==== INITIALIZE LOOKUP SEARCH
  //==================================================

  private initializeLookupSearch(): void {
    this.lookupSearch$
      .pipe(
        debounceTime(300),

        distinctUntilChanged(
          (previous, current) =>
            previous.type === current.type &&
            previous.search === current.search,
        ),

        switchMap((item) => {
          //==================================================
          //==== RESET CURRENT SEARCH
          //==================================================

          this.reset(item.type, item.search);

          this.lookupState[item.type].loading = true;

          //==================================================
          //==== REQUEST
          //==================================================

          return this.getLookupRequest(item.type, 1, item.search).pipe(
            map((response) => ({
              item,
              response,
            })),

            catchError((error) => {
              console.error(`${item.type} select search error:`, error);

              return of({
                item,
                response: null,
              });
            }),

            finalize(() => {
              this.lookupState[item.type].loading = false;
            }),
          );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ item, response }) => {
        if (!response) {
          this.setOptions(item.type, []);

          return;
        }

        //==================================================
        //==== APPLY SEARCH RESULT
        //==================================================

        this.applyLookupResponse(item.type, response, false, item.search);
      });
  }

  //==================================================
  //==== SELECT OPEN
  //==================================================

  public onLookupOpen(type: AdminLookupType): void {
    const state = this.lookupState[type];

    //==================================================
    //==== ALREADY LOADED
    //==================================================

    if (state.initialized || state.loading) {
      return;
    }

    //==================================================
    //==== OFFICE + CHAIR + ACCESS REQUIRE COMPANY
    //==================================================

    if (type !== 'company' && !this.companyId()) {
      return;
    }

    //==================================================
    //==== KEEP SELECTED EDIT OPTION
    //==================================================

    const append = this.mode() === 'edit' && this.getOptions(type).length > 0;

    //==================================================
    //==== LOAD PAGE 1
    //==================================================

    this.loadLookup(type, 1, '', append);
  }

  //==================================================
  //==== SELECT SEARCH
  //==================================================

  public onLookupSearch(
    type: AdminLookupType,
    event: Select2SearchEvent,
  ): void {
    const search = event.search?.trim() ?? '';

    const state = this.lookupState[type];

    //==================================================
    //==== OFFICE + CHAIR + ACCESS REQUIRE COMPANY
    //==================================================

    if (type !== 'company' && !this.companyId()) {
      return;
    }

    //==================================================
    //==== SAME SEARCH
    //==================================================

    if (state.initialized && !state.loading && state.search === search) {
      return;
    }

    //==================================================
    //==== SEARCH REQUEST
    //==================================================

    this.lookupSearch$.next({
      type,
      search,
    });
  }

  //==================================================
  //==== SELECT INFINITE SCROLL
  //==================================================

  public onLookupScroll(
    type: AdminLookupType,
    event: Select2ScrollEvent,
  ): void {
    if (event.way !== 'down') {
      return;
    }

    const state = this.lookupState[type];

    //==================================================
    //==== STOP CONDITION
    //==================================================

    if (state.loading || !state.hasMore) {
      return;
    }

    const search = event.search?.trim() ?? '';

    //==================================================
    //==== PREVENT OLD SEARCH PAGE
    //==================================================

    if (search !== state.search) {
      return;
    }

    //==================================================
    //==== NEXT PAGE
    //==================================================

    this.loadLookup(type, state.page + 1, search, true);
  }

  //==================================================
  //==== LOOKUP LOADING
  //==================================================

  public isLookupLoading(type: AdminLookupType): boolean {
    return this.lookupState[type].loading;
  }

  //==================================================
  //==== LOAD LOOKUP
  //==================================================

  private loadLookup(
    type: AdminLookupType,
    page: number,
    search: string,
    append: boolean,
  ): void {
    const state = this.lookupState[type];

    if (state.loading) {
      return;
    }

    //==================================================
    //==== SET STATE
    //==================================================

    state.loading = true;
    state.search = search;

    //==================================================
    //==== REQUEST
    //==================================================

    this.getLookupRequest(type, page, search)
      .pipe(
        finalize(() => {
          state.loading = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.applyLookupResponse(type, response, append, search);
        },

        error: (error) => {
          console.error(`${type} select query error:`, error);
        },
      });
  }

  //==================================================
  //==== LOOKUP REQUEST
  //==================================================

  private getLookupRequest(
    type: AdminLookupType,
    page: number,
    search: string,
  ): Observable<IAdminAccountSelectResponse> {
    const payload = {
      page,
      limit: ADMIN_LOOKUP_LIMIT,
      search,
    };

    if (type === 'company') {
      return this.adminAccountService.getCompanySelect(payload);
    }

    //==================================================
    //==== OFFICE + CHAIR + ACCESS (BY COMPANY)
    //==================================================

    const idMasterComp = this.companyId();

    if (!idMasterComp) {
      return of(emptyLookupResponse(ADMIN_LOOKUP_LIMIT));
    }

    switch (type) {
      case 'office':
        return this.adminAccountService.getOfficeSelect(idMasterComp, payload);

      case 'chair':
        return this.adminAccountService.getChairSelect(idMasterComp, payload);

      case 'access':
        return this.adminAccountService.getAccessSelect(idMasterComp, payload);
    }
  }

  //==================================================
  //==== APPLY LOOKUP RESPONSE
  //==================================================

  private applyLookupResponse(
    type: AdminLookupType,
    response: IAdminAccountSelectResponse,
    append: boolean,
    search: string,
  ): void {
    const incoming = response.data ?? [];

    const options = append
      ? mergeLookupOptions(this.getOptions(type), incoming)
      : incoming;

    //==================================================
    //==== SET OPTIONS
    //==================================================

    this.setOptions(type, options);

    //==================================================
    //==== UPDATE STATE
    //==================================================

    const state = this.lookupState[type];

    state.page = response.pagination.page;

    state.search = search;

    state.hasMore = response.pagination.has_more;

    state.initialized = true;
  }

  //==================================================
  //==== RESET LOOKUP
  //==================================================

  public reset(type: AdminLookupType, search = ''): void {
    this.lookupState[type] = emptyLookupState(search);

    this.setOptions(type, []);
  }

  //==================================================
  //==== GET / SET OPTIONS
  //==================================================

  private getOptions(type: AdminLookupType): Select2Data {
    switch (type) {
      case 'company':
        return this.companyOptions;

      case 'office':
        return this.officeOptions;

      case 'chair':
        return this.chairOptions;

      case 'access':
        return this.accessOptions;
    }
  }

  public setOptions(type: AdminLookupType, data: Select2Data): void {
    switch (type) {
      case 'company':
        this.companyOptions = data;

        break;

      case 'office':
        this.officeOptions = data;

        break;

      case 'chair':
        this.chairOptions = data;

        break;

      case 'access':
        this.accessOptions = data;

        break;
    }
  }
}
