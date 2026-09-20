import { Component, inject, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2 } from 'ng-select2-component';

import { Button } from '../../../shared/components/button/button';
import { Alert } from '../../../shared/components/widgets/alert/alert';
import { countryCodes } from '../../../shared/data/country-code';
import { LoginWithNumberAction } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-login-with-number',
  imports: [
    RouterModule,
    FormsModule,
    Button,
    ReactiveFormsModule,
    Select2,
    Alert,
    TranslateModule,
  ],
  templateUrl: './login-with-number.html',
  styleUrl: './login-with-number.scss',
})
export class LoginWithNumber {
  private formBuilder = inject(FormBuilder);
  private store = inject(Store);

  public form: FormGroup;
  public codes = countryCodes;

  readonly activeForm = output<string>();

  constructor() {
    this.form = this.formBuilder.group({
      phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]*$/)]),
      country_code: new FormControl('91', [Validators.required]),
    });
  }

  sendOtp() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store.dispatch(new LoginWithNumberAction(this.form.value)).subscribe({
        complete: () => {
          this.activeForm.emit('numberOtp');
        },
      });
    }
  }

  backForm() {
    this.activeForm.emit('login');
  }
}
