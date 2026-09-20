import { Component, inject, output, input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Button } from '../../../shared/components/button/button';
import { Alert } from '../../../shared/components/widgets/alert/alert';
import { AuthNumberLoginState } from '../../../shared/interface/auth.interface';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { VerifyNumberOTP, VerifyOTP } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-otp',
  imports: [FormsModule, ReactiveFormsModule, Button, Alert, TranslateModule],
  templateUrl: './otp.html',
  styleUrl: './otp.scss',
})
export class Otp {
  private store = inject(Store);
  formBuilder = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  readonly activeForm = output<string>();
  readonly type = input<string>();

  public form: FormGroup;
  public validate: boolean = false;
  public email: string;
  public number: AuthNumberLoginState;
  public breadcrumb: breadcrumb = {
    title: 'OTP',
    items: [
      {
        label: 'OTP',
        active: true,
      },
    ],
  };

  constructor() {
    this.form = this.formBuilder.group({
      otp: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  ngOnInit() {
    const type = this.type();
    if (type === 'email') {
      this.email = this.store.selectSnapshot((state) => state.auth.email);
      if (!this.email) {
        this.activeForm.emit('login');
      }
    } else if (type === 'number') {
      this.number = this.store.selectSnapshot((state) => state.auth.number);
      if (!this.number.phone) {
        this.activeForm.emit('login');
      }
    } else {
      this.activeForm.emit('login');
    }
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      var action: any;
      var value;
      const type = this.type();
      if (type === 'email') {
        value = {
          email: this.email,
          token: this.form.value.otp,
        };
        action = new VerifyOTP(value);
      }

      if (type === 'number') {
        value = {
          phone: this.number.phone,
          country_code: this.number.country_code,
          token: this.form.value.otp,
        };
        action = new VerifyNumberOTP(value);
      }

      this.store.dispatch(action).subscribe({
        complete: () => {
          if (this.type() === 'email') {
            this.activeForm.emit('updatePassword');
          } else {
            this.notificationService.showSuccess('Login Successfully.');
          }
        },
      });
    }
  }
  get otp() {
    return this.form.get('otp');
  }

  backForm() {
    this.activeForm.emit('email');
  }
}
