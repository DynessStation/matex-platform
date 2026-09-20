import { Params } from '../../interface/core.interface';
import { IWallet } from '../../interface/wallet.interface';

export class GetUserTransactionAction {
  static readonly type = '[Wallet] Transaction Get';
  constructor(public payload?: Params) {}
}

export class CreditWalletAction {
  static readonly type = '[Wallet] Credit';
  constructor(public payload: IWallet) {}
}

export class DebitWalletAction {
  static readonly type = '[Wallet] Debit';
  constructor(public payload: IWallet) {}
}
