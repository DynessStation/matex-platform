import { Routes } from '@angular/router';

export const questionAnswersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./questions-answers').then(m => m.QuestionsAnswers),
  },
];
