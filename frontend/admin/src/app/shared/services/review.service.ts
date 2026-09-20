import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IReviewModel } from '../interface/review.interface';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private http = inject(HttpClient);

  getReviews(payload?: Params): Observable<IReviewModel> {
    return this.http.get<IReviewModel>(`${environment.URL}/review.json`, { params: payload });
  }
}
