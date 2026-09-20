import { Params } from '../../interface/core.interface';
import { ITransactionsPayload } from '../../interface/vendor-wallet.interface';

export class GetVendorTransactionAction {
  static readonly type = '[Vendor Wallet] Transaction Get';
  constructor(public payload?: Params) {}
}

export class CreditVendorWalletAction {
  static readonly type = '[Vendor Wallet] Credit';
  constructor(public payload: ITransactionsPayload) {}
}

export class DebitVendorWalletAction {
  static readonly type = '[Vendor Wallet] Debit';
  constructor(public payload: ITransactionsPayload) {}
}
