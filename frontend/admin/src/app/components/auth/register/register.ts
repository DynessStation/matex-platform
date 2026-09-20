import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module, Select2UpdateEvent } from 'ng-select2-component';
import { Observable, map } from 'rxjs';

import { Alert } from '../../../shared/components/ui/alert/alert';
import { Button } from '../../../shared/components/ui/button/button';
import { countryCodes } from '../../../shared/data/country-code';
import { IValues } from '../../../shared/interface/setting.interface';
import { IStores } from '../../../shared/interface/store.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { CreateStoreAction } from '../../../shared/store/action/store.action';
import { CountryState } from '../../../shared/store/state/country.state';
import { SettingState } from '../../../shared/store/state/setting.state';
import { StateState } from '../../../shared/store/state/state.state';
import { StoreState } from '../../../shared/store/state/store.state';
import { CustomValidators } from '../../../shared/validator/password-match';

@Component({
  selector: 'app-register',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    Select2Module,
    RouterModule,
    CommonModule,
    Alert,
    Button,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private store = inject(Store);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private formBuilder = inject(FormBuilder);

  public form: FormGroup;
  public codes = countryCodes;

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;
  countries$: Observable<Select2Data> = inject(Store).select(
    CountryState.countries,
  ) as Observable<Select2Data>;
  store$: Observable<IStores> = inject(Store).select(
    StoreState.selectedStore,
  ) as Observable<IStores>;

  public states$: Observable<Select2Data>;
  public isBrowser: boolean;

  constructor() {
    const platformId = inject<Object>(PLATFORM_ID);

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
        status: new FormControl(1),
      },
      {
        validator: CustomValidators.MatchValidator('password', 'password_confirmation'),
      },
    );
  }

  get passwordMatchError() {
    return this.form.getError('mismatch') && this.form.get('password_confirmation')?.touched;
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

  submit() {
    this.form.markAllAsTouched();
    this.notificationService.notification = false;
    let action = new CreateStoreAction(this.form.value);
    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/auth/login');
        },
      });
    }
  }
}
