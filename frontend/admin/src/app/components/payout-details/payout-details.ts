import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { FormFields } from '../../shared/components/ui/form-fields/form-fields';
import { IPaymentDetails } from '../../shared/interface/payment-details.interface';
import {
  GetPaymentDetailsAction,
  UpdatePaymentDetailsAction,
} from '../../shared/store/action/payment-details.action';
import { PaymentDetailsState } from '../../shared/store/state/payment-details.state';

@Component({
  selector: 'app-payout-details',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    PageWrapper,
    FormFields,
    Button,
  ],
  templateUrl: './payout-details.html',
  styleUrl: './payout-details.scss',
})
export class PayoutDetails {
  private store = inject(Store);

  paymentDetails$: Observable<IPaymentDetails> = inject(Store).select(
    PaymentDetailsState.paymentDetails,
  ) as Observable<IPaymentDetails>;

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

  ngOnInit() {
    this.store.dispatch(new GetPaymentDetailsAction());
    this.paymentDetails$.subscribe(paymentDetails => {
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
      this.store.dispatch(new UpdatePaymentDetailsAction(this.form.value));
    }
  }
}
