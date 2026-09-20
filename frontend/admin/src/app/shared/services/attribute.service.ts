import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { IAttributeModel, IAttributeValueModel } from '../interface/attribute.interface';
import { Params } from '../interface/core.interface';

@Injectable({
  providedIn: 'root',
})
export class AttributeService {
  private http = inject(HttpClient);

  getAttributes(payload?: Params): Observable<IAttributeModel> {
    return this.http.get<IAttributeModel>(`${environment.URL}/attribute.json`, { params: payload });
  }

  getAttributeValues(payload?: Params): Observable<IAttributeValueModel> {
    return this.http.get<IAttributeValueModel>(`${environment.URL}/attribute-value.json`, {
      params: payload,
    });
  }
}
