import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  OutputEmitterRef,
  PLATFORM_ID,
  Signal,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';

import { Select2Data } from 'ng-select2-component';
import { distinctUntilChanged, startWith } from 'rxjs';

import { AdminAccountLookupService } from './admin-account-lookup.service';
import {
  ADMIN_DEFAULT_COUNTRY_CODE,
  ADMIN_PROFILE_PHOTO_ACCEPT,
  AdminAccountFormMode,
  AdminAccountFormValue,
  AdminPasswordStrength,
} from './form-admin-account.model';
import {
  getPasswordStrength,
  normalizeName,
  sanitizeAlias,
  sanitizeName,
  sanitizePhone,
  splitPhoneNumber,
} from './form-admin-account.util';
import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';
import { countryCodes } from '../../../shared/data/country-code';
import { IAdminAccountDetailResponse } from '../../../shared/interface/admin-account.interface';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { AdminAccountValidator } from '../../../shared/validator/admin-account.validator';

type AdminAccountDetail = IAdminAccountDetailResponse['data'];

// Shared state of the admin account form and its sections: the reactive form, the
// dependent-field rules, edit-data patching, and submit. Provided by FormAdminAccount
// (one instance per open form); the section components inject it.
@Injectable()
export class AdminAccountFormService {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);

  private destroyRef = inject(DestroyRef);

  private platformId = inject(PLATFORM_ID);

  readonly lookup = inject(AdminAccountLookupService);

  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  // Bound to the form's inputs and output in connect().
  mode: Signal<AdminAccountFormMode> = signal('create');

  editData: Signal<AdminAccountDetail | null> = signal(null);

  private formSubmit: OutputEmitterRef<AdminAccountFormValue> | null = null;

  connect(form: {
    mode: Signal<AdminAccountFormMode>;
    editData: Signal<AdminAccountDetail | null>;
    formSubmit: OutputEmitterRef<AdminAccountFormValue>;
  }): void {
    this.mode = form.mode;
    this.editData = form.editData;
    this.formSubmit = form.formSubmit;
    this.lookup.connect({
      mode: form.mode,
      companyId: () => this.form.controls.id_master_comp.value,
    });
  }

  //==================================================
  //==== GENERAL
  //==================================================

  public readonly isBrowser = isPlatformBrowser(this.platformId);

  public showPassword = false;

  public showConfirmPassword = false;

  public passwordStrength: AdminPasswordStrength = null;

  //==================================================
  //==== PROFILE PHOTO
  //==================================================

  public profilePhoto: IAttachment | null = null;

  public readonly profilePhotoAccept = ADMIN_PROFILE_PHOTO_ACCEPT;

  //==================================================
  //==== COUNTRY CODE
  //==================================================

  public readonly countryCodes: Select2Data = countryCodes;

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

      phone_country_1: [ADMIN_DEFAULT_COUNTRY_CODE, [Validators.required]],

      phone_1: ['', [Validators.required, AdminAccountValidator.phone()]],

      phone_country_2: [
        {
          value: ADMIN_DEFAULT_COUNTRY_CODE,
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
    this.initializeSecondaryFields();

    this.initializeOfficeDependency();

    this.initializePasswordStrength();

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

  private patchEditData(data: AdminAccountDetail): void {
    //==================================================
    //==== PHONE
    //==================================================

    const primaryPhone = splitPhoneNumber(data.phone_1);

    const secondaryPhone = splitPhoneNumber(data.phone_2);

    //==================================================
    //==== PROFILE PHOTO
    //==================================================

    this.profilePhoto = data.profile_photo ?? null;

    //==================================================
    //==== PRELOAD SELECT OPTIONS
    //==================================================

    this.lookup.setOptions('company', [
      {
        value: data.master_comp.id_master_comp,

        label: data.master_comp.comp_name,
      },
    ]);

    this.lookup.setOptions('office', [
      {
        value: data.office.id_office,

        label: data.office.office_name,
      },
    ]);

    this.lookup.setOptions('chair', [
      {
        value: data.chair.id_chair,

        label: data.chair.chair_name,
      },
    ]);

    this.lookup.setOptions('access', [
      {
        value: data.access.id_access,

        label: data.access.access_name,
      },
    ]);

    //==================================================
    //==== ENABLE DEPENDENT FIELDS
    //==================================================

    const controls = this.form.controls;

    for (const control of [
      controls.email_2,
      controls.phone_country_2,
      controls.phone_2,
      controls.id_office,
      controls.id_chair,
      controls.id_access,
    ]) {
      control.enable({
        emitEvent: false,
      });
    }

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

  private syncEditSelectValues(data: AdminAccountDetail): void {
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

        secondaryCountry.reset(ADMIN_DEFAULT_COUNTRY_CODE, {
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
        const controls = this.form.controls;

        const dependents = [
          { control: controls.id_office, lookup: 'office' },
          { control: controls.id_chair, lookup: 'chair' },
          { control: controls.id_access, lookup: 'access' },
        ] as const;

        //==================================================
        //==== RESET OFFICE + CHAIR + ACCESS
        //==================================================

        for (const dependent of dependents) {
          dependent.control.reset('', {
            emitEvent: false,
          });

          this.lookup.reset(dependent.lookup);
        }

        //==================================================
        //==== ENABLE ONLY WITH A COMPANY
        //==================================================

        for (const { control } of dependents) {
          if (companyId) {
            control.enable({
              emitEvent: false,
            });
          } else {
            control.disable({
              emitEvent: false,
            });
          }
        }
      });
  }

  //==================================================
  //==== PASSWORD MODE
  //==================================================

  private configurePasswordMode(mode: AdminAccountFormMode): void {
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
        this.passwordStrength = getPasswordStrength(value);
      });
  }

  //==================================================
  //==== NAME / ALIAS / PHONE
  //==================================================

  public sanitizeName(): void {
    this.replaceValue('name', sanitizeName);
  }

  public normalizeName(): void {
    const control = this.form.controls.name;

    control.setValue(normalizeName(control.value), {
      emitEvent: false,
    });
  }

  public sanitizeAlias(): void {
    this.replaceValue('alias', sanitizeAlias);
  }

  public sanitizePhone(field: 'phone_1' | 'phone_2'): void {
    if (this.replaceValue(field, sanitizePhone)) {
      this.form.controls[field].updateValueAndValidity({
        emitEvent: true,
      });
    }
  }

  /** Sets the cleaned value without events; returns whether it changed. */
  private replaceValue(
    field: 'name' | 'alias' | 'phone_1' | 'phone_2',
    clean: (value: string) => string,
  ): boolean {
    const control = this.form.controls[field];

    const sanitized = clean(control.value);

    if (sanitized === control.value) {
      return false;
    }

    control.setValue(sanitized, {
      emitEvent: false,
    });

    return true;
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

    this.formSubmit?.emit(this.form.getRawValue());
  }
}
