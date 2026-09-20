import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IFaqModel } from '../interface/faq.interface';

@Injectable({
  providedIn: 'root',
})
export class FaqService {
  private http = inject(HttpClient);

  getFaqs(payload?: Params): Observable<IFaqModel> {
    return this.http.get<IFaqModel>(`${environment.URL}/faq.json`, { params: payload });
  }
}
