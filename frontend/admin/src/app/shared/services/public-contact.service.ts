import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IPublicContactResponse, IPublicContactSettings } from '../interface/public-contact.interface';

@Injectable({ providedIn: 'root' })
export class PublicContactService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/public-contact`;
  getSettings(): Observable<IPublicContactResponse> { return this.http.get<IPublicContactResponse>(this.apiUrl); }
  updateSettings(payload: IPublicContactSettings): Observable<IPublicContactResponse> {
    return this.http.put<IPublicContactResponse>(this.apiUrl, payload);
  }
}
