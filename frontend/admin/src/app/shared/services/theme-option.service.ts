import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { IThemeOption } from '../interface/theme-option.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeOptionService {
  private http = inject(HttpClient);

  getThemeOption(): Observable<IThemeOption> {
    return this.http.get<IThemeOption>(`${environment.URL}/themeOptions.json`);
  }
}
