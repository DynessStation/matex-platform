import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Params } from '@angular/router';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { IMenuModel } from '../interface/menu.interface';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private http = inject(HttpClient);

  getMenu(payload?: Params): Observable<IMenuModel> {
    return this.http.get<IMenuModel>(`${environment.URL}/menu.json`, { params: payload });
  }
}
