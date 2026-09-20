import { isPlatformBrowser } from '@angular/common';

import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';

import { IAttachment } from '../../../shared/interface/attachment.interface';

import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';

import {
  Select2Data,
  Select2Module,
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
  startWith,
  switchMap,
} from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';

import { countryCodes } from '../../../shared/data/country-code';

import {
  IAdminAccountSelectOption,
  IAdminAccountSelectResponse,
  IAdminAccountDetailResponse,
} from '../../../shared/interface/admin-account.interface';

import { AdminAccountService } from '../../../shared/services/admin-account.service';

import { AdminAccountValidator } from '../../../shared/validator/admin-account.validator';

//==================================================
//==== FORM VALUE
//==================================================

export interface AdminAccountFormValue {
  name: string;
  alias: string;

  email_1: string;
  email_2: string;

  phone_country_1: string;
  phone_1: string;

  phone_country_2: string;
  phone_2: string;

  id_profile_photo: string;

  id_master_comp: string;
  id_office: string;
  id_chair: string;
  id_access: string;

  is_all_access: boolean;

  password: string;
  confirm_password: string;
}

//==================================================
//==== LOOKUP TYPES
//==================================================

type AdminLookupType = 'company' | 'office' | 'chair' | 'access';

interface AdminLookupState {
  page: number;
  search: string;
  hasMore: boolean;
  loading: boolean;
  initialized: boolean;
}

interface AdminLookupSearch {
  type: AdminLookupType;
  search: string;
}

@Component({
  selector: 'app-form-admin-account',

  imports: [
    ReactiveFormsModule,
    TranslateModule,
    Select2Module,
    FormFields,
    Button,
    ImageUpload,
  ],

  templateUrl: './form-admin-account.html',
  styleUrl: './form-admin-account.scss',
})
export class FormAdminAccount {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);

  private destroyRef = inject(DestroyRef);

  private platformId = inject(PLATFORM_ID);

  private adminAccountService = inject(AdminAccountService);

  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly formSubmit = output<AdminAccountFormValue>();

  //==================================================
  //==== EDIT DATA
  //==================================================

  readonly editData = input<IAdminAccountDetailResponse['data'] | null>(null);

  //==================================================
  //==== GENERAL
  //==================================================

  public isBrowser: boolean;

  public showPassword = false;

  public showConfirmPassword = false;

  public passwordStrength: 'weak' | 'normal' | 'strong' | null = null;

  //==================================================
  //==== PROFILE PHOTO
  //==================================================

  public profilePhoto: IAttachment | null = null;

  public readonly profilePhotoAccept: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  //==================================================
  //==== COUNTRY CODE
  //==================================================

  public countryCodes: Select2Data = countryCodes;

  //==================================================
  //==== LOOKUP OPTIONS
  //==================================================

  public companyOptions: Select2Data = [];

  public officeOptions: Select2Data = [];

  public chairOptions: Select2Data = [];

  public accessOptions: Select2Data = [];

  //==================================================
  //==== LOOKUP STATE
  //==================================================

  private readonly lookupLimit = 20;

  private lookupSearch$ = new Subject<AdminLookupSearch>();

  private lookupState: Record<AdminLookupType, AdminLookupState> = {
    company: {
      page: 1,
      search: '',
      hasMore: false,
      loading: false,
      initialized: false,
    },

    office: {
      page: 1,
      search: '',
      hasMore: false,
      loading: false,
      initialized: false,
    },

    chair: {
      page: 1,
      search: '',
      hasMore: false,
      loading: false,
      initialized: false,
    },

    access: {
      page: 1,
      search: '',
      hasMore: false,
      loading: false,
      initialized: false,
    },
  };

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group(
    {
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          AdminAccountValidator.nameValidator(),
        ],
      ],

      alias: [
        '',
        [
          Validators.required,
          Validators.maxLength(15),
          AdminAccountValidator.alias(),
        ],
      ],

      email_1: ['', [Validators.required, Validators.email]],

      email_2: [
        {
          value: '',
          disabled: true,
        },
        [Validators.email],
      ],

      phone_country_1: ['62', [Validators.required]],

      phone_1: ['', [Validators.required, AdminAccountValidator.phone()]],

      phone_country_2: [
        {
          value: '62',
          disabled: true,
        },
        [Validators.required],
      ],

      phone_2: [
        {
          value: '',
          disabled: true,
        },
        [AdminAccountValidator.phone()],
      ],

      id_profile_photo: [''],

      id_master_comp: ['', [Validators.required]],

      id_office: [
        {
          value: '',
          disabled: true,
        },
        [Validators.required],
      ],

      id_chair: [
        {
          value: '',
          disabled: true,
        },

        [Validators.required],
      ],

      id_access: [
        {
          value: '',
          disabled: true,
        },
        [Validators.required],
      ],

      is_all_access: [false],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          AdminAccountValidator.password(),
        ],
      ],

      confirm_password: ['', [Validators.required]],
    },
    {
      validators: AdminAccountValidator.passwordMatch(),
    },
  );

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.initializeSecondaryFields();

    this.initializeOfficeDependency();

    this.initializePasswordStrength();

    this.initializeLookupSearch();

    effect(() => {
      this.configurePasswordMode(this.mode());
      const data = this.editData();

      if (this.mode() === 'edit' && data) {
        this.patchEditData(data);
      }
    });
  }

  //==================================================
  //==== PATCH EDIT DATA
  //==================================================

  private patchEditData(data: IAdminAccountDetailResponse['data']): void {
    //==================================================
    //==== PHONE
    //==================================================

    const primaryPhone = this.splitPhoneNumber(data.phone_1);

    const secondaryPhone = this.splitPhoneNumber(data.phone_2);

    //==================================================
    //==== PROFILE PHOTO
    //==================================================

    this.profilePhoto = data.profile_photo ?? null;

    //==================================================
    //==== PRELOAD SELECT OPTIONS
    //==================================================

    this.companyOptions = [
      {
        value: data.master_comp.id_master_comp,

        label: data.master_comp.comp_name,
      },
    ];

    this.officeOptions = [
      {
        value: data.office.id_office,

        label: data.office.office_name,
      },
    ];

    this.chairOptions = [
      {
        value: data.chair.id_chair,

        label: data.chair.chair_name,
      },
    ];

    this.accessOptions = [
      {
        value: data.access.id_access,

        label: data.access.access_name,
      },
    ];

    //==================================================
    //==== ENABLE DEPENDENT FIELDS
    //==================================================

    this.form.controls.email_2.enable({
      emitEvent: false,
    });

    this.form.controls.phone_country_2.enable({
      emitEvent: false,
    });

    this.form.controls.phone_2.enable({
      emitEvent: false,
    });

    this.form.controls.id_office.enable({
      emitEvent: false,
    });

    this.form.controls.id_chair.enable({
      emitEvent: false,
    });

    this.form.controls.id_access.enable({
      emitEvent: false,
    });

    //==================================================
    //==== PATCH NORMAL VALUES
    //==================================================

    this.form.patchValue(
      {
        name: data.name,

        alias: data.alias,

        email_1: data.email_1,

        email_2: data.email_2 ?? '',

        phone_country_1: primaryPhone.countryCode,

        phone_1: primaryPhone.phone,

        phone_country_2: secondaryPhone.countryCode,

        phone_2: secondaryPhone.phone,

        id_profile_photo: data.id_profile_photo ?? '',

        is_all_access: data.is_all_access === 1,
      },
      {
        emitEvent: false,
      },
    );

    //==================================================
    //==== PATCH SELECT VALUES
    //==================================================

    this.syncEditSelectValues(data);
  }

  //==================================================
  //==== SYNC EDIT SELECT VALUES
  //==================================================

  private syncEditSelectValues(
    data: IAdminAccountDetailResponse['data'],
  ): void {
    const patchSelectValues = () => {
      this.form.patchValue(
        {
          id_master_comp: data.master_comp.id_master_comp,

          id_office: data.office.id_office,

          id_chair: data.chair.id_chair,

          id_access: data.access.id_access,
        },
        {
          emitEvent: false,
        },
      );
    };

    //==================================================
    //==== SSR
    //==================================================

    if (!this.isBrowser) {
      patchSelectValues();

      return;
    }

    //==================================================
    //==== BROWSER
    //==================================================
    //
    // Tunggu Select2 menerima [data] terlebih dahulu,
    // baru sinkronkan selected value.
    //
    //==================================================

    setTimeout(() => {
      patchSelectValues();
    }, 0);
  }

  //==================================================
  //==== SPLIT PHONE NUMBER
  //==================================================

  private splitPhoneNumber(value: string | null): {
    countryCode: string;
    phone: string;
  } {
    //==================================================
    //==== EMPTY
    //==================================================

    if (!value) {
      return {
        countryCode: '62',
        phone: '',
      };
    }

    //==================================================
    //==== NORMALIZE
    //==================================================

    let normalized = String(value).replace(/\D/g, '');

    //==================================================
    //==== LEGACY LOCAL NUMBER
    //==================================================

    if (normalized.startsWith('0')) {
      return {
        countryCode: '62',

        phone: normalized.substring(1),
      };
    }

    //==================================================
    //==== GET COUNTRY CODES
    //==================================================

    const codes = (countryCodes as any[])
      .map((item) => String(item.value ?? ''))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    //==================================================
    //==== MATCH COUNTRY
    //==================================================

    const countryCode = codes.find((code) => normalized.startsWith(code));

    //==================================================
    //==== FALLBACK
    //==================================================

    if (!countryCode) {
      return {
        countryCode: '62',
        phone: normalized,
      };
    }

    //==================================================
    //==== RESULT
    //==================================================

    return {
      countryCode,

      phone: normalized.substring(countryCode.length),
    };
  }

  //==================================================
  //==== SECONDARY EMAIL / PHONE
  //==================================================

  private initializeSecondaryFields(): void {
    //==================================================
    //==== SECONDARY EMAIL
    //==================================================

    this.form.controls.email_1.statusChanges
      .pipe(
        startWith(this.form.controls.email_1.status),

        distinctUntilChanged(),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        const secondaryEmail = this.form.controls.email_2;

        if (status === 'VALID') {
          secondaryEmail.enable({
            emitEvent: false,
          });

          return;
        }

        secondaryEmail.reset('', {
          emitEvent: false,
        });

        secondaryEmail.disable({
          emitEvent: false,
        });
      });

    //==================================================
    //==== SECONDARY PHONE
    //==================================================

    this.form.controls.phone_1.statusChanges
      .pipe(
        startWith(this.form.controls.phone_1.status),

        distinctUntilChanged(),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        const secondaryPhone = this.form.controls.phone_2;

        const secondaryCountry = this.form.controls.phone_country_2;

        if (status === 'VALID') {
          secondaryPhone.enable({
            emitEvent: false,
          });

          secondaryCountry.enable({
            emitEvent: false,
          });

          return;
        }

        secondaryPhone.reset('', {
          emitEvent: false,
        });

        secondaryPhone.disable({
          emitEvent: false,
        });

        secondaryCountry.reset('62', {
          emitEvent: false,
        });

        secondaryCountry.disable({
          emitEvent: false,
        });
      });
  }

  //==================================================
  //==== COMPANY -> OFFICE + CHAIR + ACCESS DEPENDENCY
  //==================================================

  private initializeOfficeDependency(): void {
    this.form.controls.id_master_comp.valueChanges
      .pipe(
        distinctUntilChanged(),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((companyId) => {
        const office = this.form.controls.id_office;

        const chair = this.form.controls.id_chair;

        const access = this.form.controls.id_access;

        //==================================================
        //==== RESET OFFICE
        //==================================================

        office.reset('', {
          emitEvent: false,
        });

        this.resetLookup('office');

        //==================================================
        //==== RESET CHAIR
        //==================================================

        chair.reset('', {
          emitEvent: false,
        });

        this.resetLookup('chair');

        //==================================================
        //==== RESET ACCESS
        //==================================================

        access.reset('', {
          emitEvent: false,
        });

        this.resetLookup('access');

        //==================================================
        //==== COMPANY SELECTED
        //==================================================

        if (companyId) {
          office.enable({
            emitEvent: false,
          });

          chair.enable({
            emitEvent: false,
          });

          access.enable({
            emitEvent: false,
          });

          return;
        }

        //==================================================
        //==== NO COMPANY
        //==================================================

        office.disable({
          emitEvent: false,
        });

        chair.disable({
          emitEvent: false,
        });

        access.disable({
          emitEvent: false,
        });
      });
  }

  //==================================================
  //==== PASSWORD MODE
  //==================================================

  private configurePasswordMode(mode: 'create' | 'edit'): void {
    const password = this.form.controls.password;

    const confirmPassword = this.form.controls.confirm_password;

    //==================================================
    //==== CREATE
    //==================================================

    if (mode === 'create') {
      password.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(64),
        AdminAccountValidator.password(),
      ]);

      confirmPassword.setValidators([Validators.required]);
    }

    //==================================================
    //==== EDIT
    //==================================================
    else {
      password.clearValidators();

      confirmPassword.clearValidators();

      password.reset('', {
        emitEvent: false,
      });

      confirmPassword.reset('', {
        emitEvent: false,
      });

      this.passwordStrength = null;
    }

    password.updateValueAndValidity({
      emitEvent: false,
    });

    confirmPassword.updateValueAndValidity({
      emitEvent: false,
    });

    this.form.updateValueAndValidity({
      emitEvent: false,
    });
  }

  //==================================================
  //==== PASSWORD STRENGTH
  //==================================================

  private initializePasswordStrength(): void {
    this.form.controls.password.valueChanges
      .pipe(
        startWith(this.form.controls.password.value),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.passwordStrength = this.getPasswordStrength(value);
      });
  }

  private getPasswordStrength(
    value: string,
  ): 'weak' | 'normal' | 'strong' | null {
    if (!value) {
      return null;
    }

    let score = 0;

    if (value.length >= 8) {
      score++;
    }

    if (value.length >= 12) {
      score++;
    }

    if (/\p{Ll}/u.test(value)) {
      score++;
    }

    if (/\p{Lu}/u.test(value)) {
      score++;
    }

    if (/\d/.test(value)) {
      score++;
    }

    if (/[^\p{L}\d]/u.test(value)) {
      score++;
    }

    if (score <= 3) {
      return 'weak';
    }

    if (score <= 5) {
      return 'normal';
    }

    return 'strong';
  }

  //==================================================
  //==== NAME
  //==================================================

  public sanitizeName(): void {
    const control = this.form.controls.name;

    const sanitized = control.value.replace(/[^\p{L}\s.,'-]/gu, '');

    if (sanitized !== control.value) {
      control.setValue(sanitized, {
        emitEvent: false,
      });
    }
  }

  public normalizeName(): void {
    const control = this.form.controls.name;

    const value = control.value
      .trim()

      .replace(/\s+/g, ' ')

      .replace(
        /(^|[\s'-])(\p{L})/gu,

        (_match, prefix: string, letter: string) =>
          prefix + letter.toUpperCase(),
      );

    control.setValue(value, {
      emitEvent: false,
    });
  }

  //==================================================
  //==== ALIAS
  //==================================================

  public sanitizeAlias(): void {
    const control = this.form.controls.alias;

    const sanitized = control.value.replace(/[^a-zA-Z0-9]/g, '');

    if (sanitized !== control.value) {
      control.setValue(sanitized, {
        emitEvent: false,
      });
    }
  }

  //==================================================
  //==== PHONE
  //==================================================

  public sanitizePhone(field: 'phone_1' | 'phone_2'): void {
    const control = this.form.controls[field];

    let sanitized = control.value.replace(/\D/g, '');

    sanitized = sanitized.replace(/^0+/, '');

    if (sanitized !== control.value) {
      control.setValue(sanitized, {
        emitEvent: false,
      });

      control.updateValueAndValidity({
        emitEvent: true,
      });
    }
  }

  //==================================================
  //==== PASSWORD VISIBILITY
  //==================================================

  public togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  public toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
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

          this.resetLookup(item.type, item.search);

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
          this.setLookupOptions(item.type, []);

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

    if (
      (type === 'office' || type === 'chair' || type === 'access') &&
      !this.form.controls.id_master_comp.value
    ) {
      return;
    }

    //==================================================
    //==== KEEP SELECTED EDIT OPTION
    //==================================================

    const append =
      this.mode() === 'edit' && this.getLookupOptions(type).length > 0;

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
    //==== OFFICE + ACCESS REQUIRE COMPANY
    //==================================================

    if (
      (type === 'office' || type === 'chair' || type === 'access') &&
      !this.form.controls.id_master_comp.value
    ) {
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
      limit: this.lookupLimit,
      search,
    };

    switch (type) {
      //==================================================
      //==== COMPANY
      //==================================================

      case 'company':
        return this.adminAccountService.getCompanySelect(payload);

      //==================================================
      //==== OFFICE
      //==================================================

      case 'office': {
        const idMasterComp = this.form.controls.id_master_comp.value;

        if (!idMasterComp) {
          return of({
            success: true,

            data: [],

            pagination: {
              page: 1,
              limit: this.lookupLimit,
              total: 0,
              has_more: false,
            },
          });
        }

        return this.adminAccountService.getOfficeSelect(idMasterComp, payload);
      }

      //==================================================
      //==== CHAIR
      //==================================================

      case 'chair': {
        const idMasterComp = this.form.controls.id_master_comp.value;

        if (!idMasterComp) {
          return of({
            success: true,

            data: [],

            pagination: {
              page: 1,

              limit: this.lookupLimit,

              total: 0,

              has_more: false,
            },
          });
        }

        return this.adminAccountService.getChairSelect(
          idMasterComp,

          payload,
        );
      }

      //==================================================
      //==== ACCESS
      //==================================================

      case 'access': {
        const idMasterComp = this.form.controls.id_master_comp.value;

        if (!idMasterComp) {
          return of({
            success: true,

            data: [],

            pagination: {
              page: 1,

              limit: this.lookupLimit,

              total: 0,

              has_more: false,
            },
          });
        }

        return this.adminAccountService.getAccessSelect(idMasterComp, payload);
      }
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
      ? this.mergeLookupOptions(this.getLookupOptions(type), incoming)
      : incoming;

    //==================================================
    //==== SET OPTIONS
    //==================================================

    this.setLookupOptions(type, options);

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

  private resetLookup(type: AdminLookupType, search = ''): void {
    this.lookupState[type] = {
      page: 1,
      search,
      hasMore: false,
      loading: false,
      initialized: false,
    };

    this.setLookupOptions(type, []);
  }

  //==================================================
  //==== GET LOOKUP OPTIONS
  //==================================================

  private getLookupOptions(type: AdminLookupType): Select2Data {
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

  //==================================================
  //==== SET LOOKUP OPTIONS
  //==================================================

  private setLookupOptions(type: AdminLookupType, data: Select2Data): void {
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

  //==================================================
  //==== MERGE LOOKUP OPTIONS
  //==================================================

  private mergeLookupOptions(
    current: Select2Data,
    incoming: IAdminAccountSelectOption[],
  ): Select2Data {
    const result = new Map<string, IAdminAccountSelectOption>();

    (current as IAdminAccountSelectOption[]).forEach((item) => {
      result.set(String(item.value), item);
    });

    incoming.forEach((item) => {
      result.set(String(item.value), item);
    });

    return Array.from(result.values());
  }

  //==================================================
  //==== LOOKUP LOADING
  //==================================================

  public isLookupLoading(type: AdminLookupType): boolean {
    return this.lookupState[type].loading;
  }

  //==================================================
  //==== PROFILE PHOTO
  //==================================================

  public selectProfilePhoto(data: MediaSelection): void {
    //==================================================
    //==== EMPTY
    //==================================================

    if (!data) {
      this.profilePhoto = null;

      this.form.controls.id_profile_photo.setValue('');

      return;
    }

    //==================================================
    //==== ARRAY
    //==================================================

    if (Array.isArray(data)) {
      const attachment =
        data.find((item): item is IAttachment => typeof item !== 'string') ??
        null;

      this.profilePhoto = attachment;

      this.form.controls.id_profile_photo.setValue(
        attachment?.id_attachment ?? '',
      );

      return;
    }

    //==================================================
    //==== URL
    //==================================================

    if (typeof data === 'string') {
      return;
    }

    //==================================================
    //==== ATTACHMENT
    //==================================================

    this.profilePhoto = data;

    this.form.controls.id_profile_photo.setValue(data.id_attachment);
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  public submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();

    this.formSubmit.emit(value);
  }
}
