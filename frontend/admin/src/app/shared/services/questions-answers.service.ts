import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IQnAModel } from '../interface/questions-answers.interface';

@Injectable({
  providedIn: 'root',
})
export class QuestionsAnswersService {
  private http = inject(HttpClient);

  getQuestionAnswers(payload?: Params): Observable<IQnAModel> {
    return this.http.get<IQnAModel>(`${environment.URL}/question-and-answer.json`, {
      params: payload,
    });
  }
}
