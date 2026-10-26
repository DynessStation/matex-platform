import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IAuthResponse } from '../interface/auth.interface';

export interface IProfilePayload {
  name: string;
  email_2: string | null;
  phone_2: string | null;
}

export interface IPasswordChangePayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// "Profil saya" (U-16): the signed-in admin's own name, backup contacts, photo, and password.
// Profile calls answer with the session account, as /me does.
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/admin-acct/me`;

  updateProfile(payload: IProfilePayload): Observable<IAuthResponse> {
    return this.http.put<IAuthResponse>(this.apiUrl, payload);
  }

  uploadPhoto(file: File): Observable<IAuthResponse> {
    const form = new FormData();

    form.append('file', file);

    return this.http.post<IAuthResponse>(`${this.apiUrl}/photo`, form);
  }

  removePhoto(): Observable<IAuthResponse> {
    return this.http.delete<IAuthResponse>(`${this.apiUrl}/photo`);
  }

  changePassword(payload: IPasswordChangePayload): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/password`, payload);
  }
}
