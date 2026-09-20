
import { Component, inject, Renderer2, DOCUMENT, viewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AnswersModal } from './answers-modal/answers-modal';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { IQnAModel, IQuestionAnswers } from '../../shared/interface/questions-answers.interface';
import { IStores } from '../../shared/interface/store.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllQuestionAnswersAction,
  DeleteQuestionAnswersAction,
  GetQuestionAnswersAction,
} from '../../shared/store/action/questions-answers.action';
import { QuestionAnswersState } from '../../shared/store/state/questions-answers.state';

@Component({
  selector: 'app-questions-answers',
  imports: [PageWrapper, Table, AnswersModal, TranslateModule],
  templateUrl: './questions-answers.html',
  styleUrl: './questions-answers.scss',
})
export class QuestionsAnswers {
  private store = inject(Store);
  private renderer = inject(Renderer2);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private document = inject<Document>(DOCUMENT);

  questionAnswers$: Observable<IQnAModel> = inject(Store).select(
    QuestionAnswersState.questionAnswers,
  );

  readonly AnswersModal = viewChild<AnswersModal>('answersModal');

  public total: number;
  public selectedStatus: string;
  public filter: Params = {};
  public tableConfig: ITableConfig = {
    columns: [
      { title: 'Question', dataField: 'question' },
      { title: 'product', dataField: 'product_name' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'status', dataField: 'status', sortable: true, sort_direction: 'desc' },
    ],
    rowActions: [
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'store.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'store.destroy',
      },
    ],
    data: [] as IQuestionAnswers[],
    total: 0,
  };

  ngOnInit() {
    this.questionAnswers$.subscribe(questionAnswers => {
      this.total = questionAnswers.total;
      let questions = questionAnswers.data.filter(element => {
        element.product_name = element?.product?.name;
        element.status = element?.answer
          ? `<div class="status-approved"><span>Repelled</span></div>`
          : `<div class="status-pending"><span>Pending</span></div>`;
        return element;
      });
      this.tableConfig.data = questions ? questions : [];
      this.tableConfig.total =
        questionAnswers && questionAnswers?.total ? questionAnswers?.total : 0;
    });

    this.activatedRoute.queryParams.subscribe(params => {
      this.filter = { ...this.filter, status: params['status'] ? params['status'] : '' };
      this.selectedStatus = params['status'];
      this.store.dispatch(new GetQuestionAnswersAction(this.filter));
    });
  }

  onTableChange(data?: Params) {
    const status = this.selectedStatus ? this.selectedStatus : '';
    this.filter = { ...this.filter, ...data };
    this.filter['status'] = status;
    this.store.dispatch(new GetQuestionAnswersAction(this.filter));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') void this.AnswersModal().openModal(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  filterOrder(status: string) {
    this.renderer.addClass(this.document.body, 'loader-none');
    void this.router.navigate([], {
      queryParams: {
        status: status ? status : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  delete(data: IStores) {
    this.store.dispatch(new DeleteQuestionAnswersAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllQuestionAnswersAction(ids));
  }
}
