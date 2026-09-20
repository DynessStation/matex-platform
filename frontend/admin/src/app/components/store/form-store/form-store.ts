import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module, Select2UpdateEvent } from 'ng-select2-component';
import { Observable, Subject, map, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { countryCodes } from '../../../shared/data/country-code';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { IStores } from '../../../shared/interface/store.interface';
import {
  CreateStoreAction,
  EditStoreAction,
  UpdateStoreAction,
} from '../../../shared/store/action/store.action';
import { CountryState } from '../../../shared/store/state/country.state';
import { StateState } from '../../../shared/store/state/state.state';
import { StoreState } from '../../../shared/store/state/store.state';
import { CustomValidators } from '../../../shared/validator/password-match';

@Component({
  selector: 'app-form-store',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    Select2Module,
    CommonModule,
    FormFields,
    ImageUpload,
    Button,
  ],
  templateUrl: './form-store.html',
  styleUrl: './form-store.scss',
})
export class FormStore {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  countries$: Observable<Select2Data> = inject(Store).select(
    CountryState.countries,
  ) as Observable<Select2Data>;
  store$: Observable<IStores> = inject(Store).select(
    StoreState.selectedStore,
  ) as Observable<IStores>;

  public states$: Observable<Select2Data>;

  private destroy$ = new Subject<void>();
  public isBrowser: boolean;

  public form: FormGroup;
  public id: number;
  public codes = countryCodes;
  public mediaConfig = mediaConfig;
  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.formBuilder.group(
      {
        store_name: new FormControl('', [Validators.required]),
        description: new FormControl('', [Validators.required]),
        country_id: new FormControl('', [Validators.required]),
        state_id: new FormControl('', [Validators.required]),
        city: new FormControl('', [Validators.required]),
        address: new FormControl('', [Validators.required]),
        pincode: new FormControl('', [Validators.required]),
        name: new FormControl('', [Validators.required]),
        email: new FormControl('', [Validators.required, Validators.email]),
        phone: new FormControl('', [Validators.required]),
        country_code: new FormControl('1', [Validators.required]),
        password: new FormControl('', [Validators.required]),
        password_confirmation: new FormControl('', [Validators.required]),
        store_logo_id: new FormControl(''),
        store_cover_id: new FormControl(''),
        hide_vendor_email: new FormControl(0),
        hide_vendor_phone: new FormControl(0),
        status: new FormControl(1),
        facebook: new FormControl(''),
        instagram: new FormControl(''),
        pinterest: new FormControl(''),
        youtube: new FormControl(''),
        twitter: new FormControl(''),
      },
      {
        validator: CustomValidators.MatchValidator('password', 'password_confirmation'),
      },
    );
  }

  get passwordMatchError() {
    return this.form.getError('mismatch') && this.form.get('password_confirmation')?.touched;
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          this.states$ = this.store.select(StateState.states).pipe(map(filterFn => filterFn(null)));
          return this.store
            .dispatch(new EditStoreAction(params['id']))
            .pipe(mergeMap(() => this.store.select(StoreState.selectedStore)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(store => {
        this.id = store?.id!;
        this.form.patchValue({
          store_name: store?.store_name,
          description: store?.description,
          country_id: store?.country_id,
          state_id: store?.state_id,
          city: store?.city,
          address: store?.address,
          pincode: store?.pincode,
          name: store?.vendor?.name,
          email: store?.vendor?.email,
          country_code: store?.vendor?.country_code,
          phone: store?.vendor?.phone,
          store_logo_id: store?.store_logo_id,
          store_cover_id: store?.store_cover_id,
          hide_vendor_email: store?.hide_vendor_email,
          hide_vendor_phone: store?.hide_vendor_phone,
          status: store?.status,
          facebook: store?.facebook,
          instagram: store?.instagram,
          pinterest: store?.pinterest,
          youtube: store?.youtube,
          twitter: store?.twitter,
        });
      });
  }

  countryChange(data: Select2UpdateEvent) {
    if (data && data?.value) {
      this.states$ = this.store
        .select(StateState.states)
        .pipe(map(filterFn => filterFn(+data?.value)));
      this.form.controls['state_id'].setValue('');
    } else {
      this.form.controls['state_id'].setValue('');
    }
  }

  selectStoreLogo(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['store_logo_id'].setValue(data ? data.id : '');
    }
  }

  selectStoreCover(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['store_cover_id'].setValue(data ? data.id : '');
    }
  }

  submit() {
    this.form.markAllAsTouched();

    let action = new CreateStoreAction(this.form.value);
    if (this.type() == 'edit' && this.id) {
      this.form.removeControl('password');
      this.form.removeControl('password_confirmation');
      action = new UpdateStoreAction(this.form.value, this.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          this.form.reset();
          void this.router.navigateByUrl('/store');
        },
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
