import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IThemesModel } from '../interface/theme.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private http = inject(HttpClient);

  getThemes(): Observable<IThemesModel> {
    return this.http.get<IThemesModel>(`${environment.URL}/theme.json`);
  }

  getHomePage<T>(payload?: Params): Observable<T> {
    return this.http.get<T>(`${environment.URL}/home/${payload!['slug']}.json`);
  }
}
