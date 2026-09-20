import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { QnAModel } from '../interface/questions-answers.interface';

@Injectable({
  providedIn: 'root',
})
export class QuestionsAnswerService {
  public skeletonLoader: boolean = false;

  constructor(private http: HttpClient) {}

  getQuestionAnswers(slug: Params): Observable<QnAModel> {
    return this.http.get<QnAModel>(`${environment.URL}/question-and-answer.json`, { params: slug });
  }
}
