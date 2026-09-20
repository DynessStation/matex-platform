import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { ICountry } from '../interface/country.interface';

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private http = inject(HttpClient);
  private platformId = inject<Object>(PLATFORM_ID);

  getCountries(): Observable<ICountry[]> {
    return this.http.get<ICountry[]>(`${environment.URL}/country.json`);
  }
}
