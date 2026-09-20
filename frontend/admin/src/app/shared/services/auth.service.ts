import { HttpClient } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IAuthLogoutResponse,
  IAuthResponse,
  IAuthUserStateModel,
} from '../interface/auth.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/admin-acct`;

  //==================================================
  //==== LOGIN
  //==================================================

  login(payload: IAuthUserStateModel): Observable<IAuthResponse> {
    return this.http.post<IAuthResponse>(`${this.apiUrl}/login`, payload, {
      withCredentials: true,
    });
  }

  //==================================================
  //==== ME
  //==================================================

  me(): Observable<IAuthResponse> {
    return this.http.get<IAuthResponse>(`${this.apiUrl}/me`, {
      withCredentials: true,
    });
  }

  //==================================================
  //==== LOGOUT
  //==================================================

  logout(): Observable<IAuthLogoutResponse> {
    return this.http.post<IAuthLogoutResponse>(
      `${this.apiUrl}/logout`,
      {},
      {
        withCredentials: true,
      },
    );
  }
}
