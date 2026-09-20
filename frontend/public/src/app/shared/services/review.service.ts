import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReviewModel } from '../interface/review.interface';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  constructor(private http: HttpClient) {}

  getReview(slug: Params): Observable<ReviewModel> {
    return this.http.get<ReviewModel>(`${environment.URL}/review.json`, { params: slug });
  }
}
