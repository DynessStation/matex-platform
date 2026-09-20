import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IWallet } from '../interface/wallet.interface';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private http = inject(HttpClient);

  getUserTransaction(payload?: Params): Observable<IWallet> {
    return this.http.get<IWallet>(`${environment.URL}/wallet.json`, { params: payload });
  }
}
