import { AsyncPipe, CommonModule } from '@angular/common';
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
import { UpdatePasswordAction } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-update-password',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    Alert,
    Button,
    AsyncPipe,
  ],
  templateUrl: './update-password.html',
  styleUrl: './update-password.scss',
})
export class UpdatePassword {
  private store = inject(Store);
  private formBuilder = inject(FormBuilder);
  router = inject(Router);

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public form: FormGroup;
  public email: string;
  public token: number;
  public show: boolean = false;

  constructor() {
    this.email = this.store.selectSnapshot(state => state.auth.email);
    this.token = this.store.selectSnapshot(state => state.auth.token);
    if (!this.email && !this.token) void this.router.navigateByUrl('/auth/login');
    this.form = this.formBuilder.group({
      newPassword: new FormControl('', [Validators.required]),
      confirmPassword: new FormControl('', [Validators.required]),
    });
  }

  showPassword() {
    this.show = !this.show;
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store
        .dispatch(
          new UpdatePasswordAction({
            email: this.email,
            token: Number(this.token),
            password: this.form.value.newPassword,
            password_confirmation: this.form.value.confirmPassword,
          }),
        )
        .subscribe({
          complete: () => {
            void this.router.navigateByUrl('/auth/login');
          },
        });
    }
  }
}
