import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { IPaymentDetails } from '../interface/payment-details.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentDetailsService {
  private http = inject(HttpClient);

  getPaymentAccount(): Observable<IPaymentDetails> {
    return this.http.get<IPaymentDetails>(`${environment.URL}/paymentAccount`);
  }
}
