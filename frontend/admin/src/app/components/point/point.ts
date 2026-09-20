import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, Renderer2, DOCUMENT, viewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { ConfirmationModal } from '../../shared/components/ui/modal/confirmation-modal/confirmation-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IPoint, ITransactionsData } from '../../shared/interface/point.interface';
import {
  CreditPointAction,
  DebitPointAction,
  GetUserTransactionAction,
} from '../../shared/store/action/point.action';
import { GetUsersAction } from '../../shared/store/action/user.action';
import { PointState } from '../../shared/store/state/point.state';
import { UserState } from '../../shared/store/state/user.state';

@Component({
  selector: 'app-point',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    HasPermissionDirective,
    ReactiveFormsModule,
    Select2Module,
    PageWrapper,
    Button,
    Table,
    ConfirmationModal,
  ],
  templateUrl: './point.html',
  styleUrl: './point.scss',
})
export class Point {
  private document = inject<Document>(DOCUMENT);
  private renderer = inject(Renderer2);
  private store = inject(Store);
  private formBuilder = inject(FormBuilder);

  users$: Observable<Select2Data> = inject(Store).select(UserState.users);
  point$: Observable<IPoint> = inject(Store).select(PointState.point) as Observable<IPoint>;

  readonly ConfirmationModal = viewChild<ConfirmationModal>('confirmationModal');

  public form: FormGroup;
  public balance: number = 0.0;
  public paginateInitialData: Params;
  public isBrowser: boolean;

  public tableConfig = {
    columns: [
      { title: 'points', dataField: 'amount' },
      { title: 'type', dataField: 'type_status' },
      { title: 'remark', dataField: 'detail' },
      { title: 'created_at', dataField: 'created_at', type: 'date' },
    ],
    data: [] as ITransactionsData[],
    total: 0,
  };

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.store.dispatch(new GetUsersAction({ role: 'consumer', status: 1 }));
    this.form = this.formBuilder.group({
      consumer_id: new FormControl('', [Validators.required]),
      balance: new FormControl('', [Validators.required]),
    });

    this.form.controls['consumer_id'].valueChanges.subscribe(value => {
      if (value) {
        this.paginateInitialData['consumer_id'] = value;
        this.store.dispatch(new GetUserTransactionAction(this.paginateInitialData));
        this.point$.subscribe(point => {
          let transactions = point?.transactions?.data?.filter((element: ITransactionsData) => {
            element.type_status = element.type
              ? `<div class="status-${element.type}"><span>${element.type.replace(/_/g, ' ')}</span></div>`
              : '-';
            return element;
          });
          this.balance = point ? point?.balance : 0.0;
          this.tableConfig.data = point ? transactions : [];
          this.tableConfig.total = point ? point?.transactions?.total : 0;
        });
        this.renderer.addClass(this.document.body, 'loader-none');
      } else {
        this.balance = 0;
        this.tableConfig.data = [];
        this.tableConfig.total = 0;
        this.form.controls['balance'].reset();
      }
    });
  }

  onTableChange(data?: Params) {
    this.paginateInitialData = data!;
    let vendor_id = this.form.controls['consumer_id']?.value;
    this.paginateInitialData['consumer_id'] = vendor_id;
    if (vendor_id) {
      this.store.dispatch(new GetUserTransactionAction(data));
    }
  }

  submit(type: string) {
    this.form.markAllAsTouched();
    let action = new CreditPointAction(this.form.value);

    if (type == 'debit') {
      action = new DebitPointAction(this.form.value);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          this.form.controls['balance'].reset();
        },
      });
    }
  }

  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'loader-none');
  }
}
