import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Alert } from '../../../shared/components/ui/alert/alert';
import { Button } from '../../../shared/components/ui/button/button';
import { IValues } from '../../../shared/interface/setting.interface';
import { ForgotPassWordAction } from '../../../shared/store/action/auth.action';
import { SettingState } from '../../../shared/store/state/setting.state';

@Component({
  selector: 'app-forgot-password',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, Alert, Button, AsyncPipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private store = inject(Store);
  router = inject(Router);
  formBuilder = inject(FormBuilder);

  public form: FormGroup;

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  constructor() {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store.dispatch(new ForgotPassWordAction(this.form.value)).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/auth/otp');
        },
      });
    }
  }
}
