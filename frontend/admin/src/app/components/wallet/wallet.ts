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
import { Params } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { ConfirmationModal } from '../../shared/components/ui/modal/confirmation-modal/confirmation-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IValues } from '../../shared/interface/setting.interface';
import { ITableConfig } from '../../shared/interface/table.interface';
import { ITransactionsData, IWallet } from '../../shared/interface/wallet.interface';
import { CurrencySymbolPipe } from '../../shared/pipe/currency-symbol.pipe';
import { GetUsersAction } from '../../shared/store/action/user.action';
import {
  CreditWalletAction,
  DebitWalletAction,
  GetUserTransactionAction,
} from '../../shared/store/action/wallet.action';
import { SettingState } from '../../shared/store/state/setting.state';
import { UserState } from '../../shared/store/state/user.state';
import { WalletState } from '../../shared/store/state/wallet.state';

@Component({
  selector: 'app-wallet',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencySymbolPipe,
    HasPermissionDirective,
    Select2Module,
    PageWrapper,
    Table,
    Button,
    ConfirmationModal,
  ],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss',
})
export class Wallet {
  private document = inject<Document>(DOCUMENT);
  private renderer = inject(Renderer2);
  private store = inject(Store);
  private formBuilder = inject(FormBuilder);

  users$: Observable<Select2Data> = inject(Store).select(UserState.users);
  wallet$: Observable<IWallet> = inject(Store).select(WalletState.wallet) as Observable<IWallet>;
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  readonly ConfirmationModal = viewChild<ConfirmationModal>('confirmationModal');

  public form: FormGroup;
  public balance: number = 0.0;
  public paginateInitialData: Params;
  public isBrowser: boolean;

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'amount', dataField: 'amount', type: 'price' },
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
        this.wallet$.subscribe(wallet => {
          let transactions = wallet?.transactions?.data?.filter((element: ITransactionsData) => {
            element.type_status = element.type
              ? `<div class="status-${element.type}"><span>${element.type.replace(/_/g, ' ')}</span></div>`
              : '-';
            return element;
          });
          this.balance = wallet ? wallet?.balance : 0;
          this.tableConfig.data = wallet ? transactions : [];
          this.tableConfig.total = wallet ? wallet?.transactions?.total : 0;
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
    let action = new CreditWalletAction(this.form.value);

    if (type == 'debit') {
      action = new DebitWalletAction(this.form.value);
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
