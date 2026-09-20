import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IVenderWallet } from '../interface/vendor-wallet.interface';

@Injectable({
  providedIn: 'root',
})
export class VendorWalletService {
  private http = inject(HttpClient);

  getVendorTransaction(payload?: Params): Observable<IVenderWallet> {
    return this.http.get<IVenderWallet>(`${environment.URL}/wallet.json`, { params: payload });
  }
}
