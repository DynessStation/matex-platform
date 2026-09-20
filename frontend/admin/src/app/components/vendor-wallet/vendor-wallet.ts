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
import { IValues } from '../../shared/interface/setting.interface';
import { ITableConfig } from '../../shared/interface/table.interface';
import { ITransactionsData, IVenderWallet } from '../../shared/interface/vendor-wallet.interface';
import { CurrencySymbolPipe } from '../../shared/pipe/currency-symbol.pipe';
import { GetUsersAction } from '../../shared/store/action/user.action';
import {
  CreditVendorWalletAction,
  DebitVendorWalletAction,
  GetVendorTransactionAction,
} from '../../shared/store/action/vendor-wallet.action';
import { AccountState } from '../../shared/store/state/account.state';
import { SettingState } from '../../shared/store/state/setting.state';
import { UserState } from '../../shared/store/state/user.state';
import { VendorWalletState } from '../../shared/store/state/vendor-wallet.state';

@Component({
  selector: 'app-vendor-wallet',
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
  templateUrl: './vendor-wallet.html',
  styleUrl: './vendor-wallet.scss',
})
export class VendorWallet {
  private document = inject<Document>(DOCUMENT);
  private renderer = inject(Renderer2);
  private store = inject(Store);
  private formBuilder = inject(FormBuilder);

  users$: Observable<Select2Data> = inject(Store).select(UserState.users);
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;
  vendorWallet$: Observable<IVenderWallet> = inject(Store).select(
    VendorWalletState.vendorWallet,
  ) as Observable<IVenderWallet>;
  roleName$: Observable<string> = inject(Store).select(
    AccountState.getRoleName,
  ) as Observable<string>;

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

    if (this.store.selectSnapshot(state => state.account.roleName !== 'vendor')) {
      this.store.dispatch(new GetUsersAction({ role: 'vendor', status: 1 }));
    }
    this.form = this.formBuilder.group({
      vendor_id: new FormControl('', [Validators.required]),
      balance: new FormControl('', [Validators.required]),
    });

    if (this.store.selectSnapshot(state => state.account.roleName !== 'vendor')) {
      this.form.controls['vendor_id'].valueChanges.subscribe(value => {
        if (value) {
          this.paginateInitialData['vendor_id'] = value;
          this.store.dispatch(new GetVendorTransactionAction(this.paginateInitialData));
          this.transactions();
        }
      });
    } else {
      this.store.dispatch(new GetVendorTransactionAction());
      this.transactions();
    }
  }

  transactions() {
    this.vendorWallet$.subscribe(wallet => {
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
  }

  onTableChange(data?: Params) {
    this.paginateInitialData = data!;
    let vendor_id = this.form.controls['vendor_id']?.value;
    this.paginateInitialData['vendor_id'] = vendor_id;
    if (vendor_id) {
      this.store.dispatch(new GetVendorTransactionAction(this.paginateInitialData));
    }
  }

  submit(type: string) {
    this.form.markAllAsTouched();
    let action = new CreditVendorWalletAction(this.form.value);

    if (type == 'debit') {
      action = new DebitVendorWalletAction(this.form.value);
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
