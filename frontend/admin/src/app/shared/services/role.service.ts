import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IModule, IRoleModel } from '../interface/role.interface';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);

  getRoleModules(): Observable<IModule[]> {
    return this.http.get<IModule[]>(`${environment.URL}/module.json`);
  }

  getRoles(payload?: Params): Observable<IRoleModel> {
    return this.http.get<IRoleModel>(`${environment.URL}/role.json`, { params: payload });
  }
}
