import { Component, inject } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { Params } from '../../shared/interface/core.interface';
import { IReview, IReviewModel } from '../../shared/interface/review.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  GetReviewsAction,
  DeleteReviewAction,
  DeleteAllReviewAction,
} from '../../shared/store/action/review.action';
import { ReviewState } from '../../shared/store/state/review.state';

@Component({
  selector: 'app-review',
  imports: [PageWrapper, Table],
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class Review {
  private store = inject(Store);

  review$: Observable<IReviewModel> = inject(Store).select(ReviewState.review);

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'image',
        dataField: 'product_review_image',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      { title: 'consumer_name', dataField: 'consumer_name' },
      { title: 'product_name', dataField: 'product_name' },
      {
        title: 'rating',
        dataField: 'rating',
        type: 'rating',
        sortable: true,
        sort_direction: 'desc',
      },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    rowActions: [
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'review.destroy',
      },
    ],
    data: [] as IReview[],
    total: 0,
  };

  constructor() {
    this.store.dispatch(new GetReviewsAction());
  }

  ngOnInit() {
    this.review$.subscribe(review => {
      let reviews = review?.data?.filter((element: IReview) => {
        element.product_review_image = element?.product?.product_thumbnail;
        element.consumer_name = element?.consumer?.name;
        element.product_name = element?.product?.name;
        return element;
      });
      this.tableConfig.data = review ? reviews : [];
      this.tableConfig.total = review ? review.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetReviewsAction(data!));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  delete(data: IReview) {
    this.store.dispatch(new DeleteReviewAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllReviewAction(ids));
  }
}
