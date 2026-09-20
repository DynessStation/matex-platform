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
import { ForgotPasswordAction } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, ReactiveFormsModule, Button, Alert, TranslateModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private store = inject(Store);
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  readonly activeForm = output<string>();

  public form: FormGroup;
  public validate: boolean = false;
  public breadcrumb: breadcrumb = {
    title: 'forgot password',
    items: [
      {
        label: 'forgot password',
        active: true,
      },
    ],
  };

  constructor() {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store.dispatch(new ForgotPasswordAction(this.form.value)).subscribe({
        complete: () => {
          this.activeForm.emit('otp');
        },
      });
    }
  }

  get email() {
    return this.form.get('email');
  }

  backForm() {
    this.activeForm.emit('login');
  }

  action(action: string) {
    this.activeForm.emit(action);
  }
}
