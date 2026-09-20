import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/button/button';
import { PaymentDetails } from '../../../shared/interface/payment-details.interface';
import {
  GetPaymentDetails,
  UpdatePaymentDetails,
} from '../../../shared/store/action/payment-details.action';
import { PaymentDetailsState } from '../../../shared/store/state/payment-details.state';

@Component({
  selector: 'app-bank-details',
  imports: [ReactiveFormsModule, FormsModule, Button, TranslateModule],
  templateUrl: './bank-details.html',
  styleUrl: './bank-details.scss',
})
export class BankDetails {
  private store = inject(Store);
  paymentDetails$: Observable<PaymentDetails | null> = this.store.select(
    PaymentDetailsState.paymentDetails,
  );

  public form: FormGroup;
  public active = 'bank';

  constructor() {
    this.form = new FormGroup({
      bank_account_no: new FormControl(),
      bank_name: new FormControl(),
      bank_holder_name: new FormControl(),
      swift: new FormControl(),
      ifsc: new FormControl(),
      paypal_email: new FormControl('', [Validators.email]),
    });
  }

  ngOnInit(): void {
    this.store.dispatch(new GetPaymentDetails());
    this.paymentDetails$.subscribe((paymentDetails) => {
      this.form.patchValue({
        bank_account_no: paymentDetails?.bank_account_no,
        bank_name: paymentDetails?.bank_name,
        bank_holder_name: paymentDetails?.bank_holder_name,
        swift: paymentDetails?.swift,
        ifsc: paymentDetails?.ifsc,
        paypal_email: paymentDetails?.paypal_email,
      });
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store.dispatch(new UpdatePaymentDetails(this.form.value));
    }
  }
}
