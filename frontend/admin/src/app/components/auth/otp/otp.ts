import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IValues } from 'src/app/shared/interface/setting.interface';
import { SettingState } from 'src/app/shared/store/state/setting.state';

import { Alert } from '../../../shared/components/ui/alert/alert';
import { Button } from '../../../shared/components/ui/button/button';
import { VerifyEmailOtpAction } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-otp',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, Alert, Button, AsyncPipe],
  templateUrl: './otp.html',
  styleUrl: './otp.scss',
})
export class Otp {
  router = inject(Router);
  store = inject(Store);
  formBuilder = inject(FormBuilder);

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public form: FormGroup;
  public email: string;
  public loading: boolean;

  constructor() {
    this.email = this.store.selectSnapshot(state => state.auth.email);
    if (!this.email) void this.router.navigateByUrl('/auth/login');
    this.form = this.formBuilder.group({
      otp: new FormControl('', [Validators.required, Validators.minLength(5)]),
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store
        .dispatch(
          new VerifyEmailOtpAction({
            email: this.email,
            token: this.form.value.otp,
          }),
        )
        .subscribe({
          complete: () => {
            void this.router.navigateByUrl('/auth/update-password');
          },
        });
    }
  }
}
