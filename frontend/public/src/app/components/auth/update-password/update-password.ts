import { Component, inject, output } from '@angular/core';
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

import { Button } from '../../../shared/components/button/button';
import { Alert } from '../../../shared/components/widgets/alert/alert';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { UpdatePasswordAction } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-update-password',
  imports: [FormsModule, ReactiveFormsModule, Button, Alert, TranslateModule],
  templateUrl: './update-password.html',
  styleUrl: './update-password.scss',
})
export class UpdatePassword {
  private store = inject(Store);
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  readonly activeForm = output<string>();

  public form: FormGroup;
  public validate: boolean = false;
  public email: string;
  public token: string;
  public breadcrumb: breadcrumb = {
    title: 'update password',
    items: [
      {
        label: 'update password',
        active: true,
      },
    ],
  };

  constructor() {
    this.email = this.store.selectSnapshot((state) => state.auth.email);
    this.token = this.store.selectSnapshot((state) => state.auth.token);
    if (!this.email && !this.token) this.activeForm.emit('login');
    this.form = this.formBuilder.group({
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store
        .dispatch(
          new UpdatePasswordAction({
            email: this.email,
            token: this.token,
            password: this.form.value.newPassword,
            password_confirmation: this.form.value.confirmPassword,
          }),
        )
        .subscribe({
          complete: () => {
            this.activeForm.emit('login');
          },
        });
    }
  }

  get newPassword() {
    return this.form.get('newPassword');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }
}
