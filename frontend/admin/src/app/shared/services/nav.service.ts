import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IBadges } from '../interface/sidebar.interface';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  private http = inject(HttpClient);

  // Search Box
  public search: boolean = false;

  public collapseSidebar: boolean = false;
  public sidebarLoading: boolean = false;
  public fullScreen: boolean = false;

  getBadges(payload?: Params): Observable<IBadges> {
    return this.http.get<IBadges>(`${environment.URL}/badge.json`, payload);
  }
}
