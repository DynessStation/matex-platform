import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { ITagModel } from '../interface/tag.interface';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  private http = inject(HttpClient);

  getTags(payload?: Params): Observable<ITagModel> {
    return this.http.get<ITagModel>(`${environment.URL}/tag.json`, { params: payload });
  }
}
