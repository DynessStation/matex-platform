import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { ILicenseKeyModel } from '../interface/license-key.interface';

@Injectable({
  providedIn: 'root',
})
export class LicenseKeyService {
  private http = inject(HttpClient);

  getLicenseKeys(payload?: Params): Observable<ILicenseKeyModel> {
    return this.http.get<ILicenseKeyModel>(`${environment.URL}/license-key.json`, {
      params: payload,
    });
  }
}
