//==================================================
//==== SIDEBAR MODEL
//==================================================

export interface ISidebarModel {
  data: ISidebar[];
}

//==================================================
//==== SIDEBAR ITEM
//==================================================

export interface ISidebar {
  id?: number;

  parent_id?: number;

  title?: string;

  path?: string;

  active?: boolean;

  children?: ISidebar[];

  icon?: string;

  type?: 'sub' | 'link';

  badgeType?: string;

  badgeValue?: string | number;

  level?: number;

  //==================================================
  //==== MATEX ACCESS
  //==================================================

  permission?: string | string[];

  permissionMode?: 'any' | 'all';

  feature?: string;

  //==================================================
  //==== LEGACY TEMPLATE
  //==================================================

  canAllow?: string[];

  acl_permission?: string[];

  params?: Record<string, any>;
}

//==================================================
//==== LEGACY BADGES
//==================================================

export interface IBadges {
  product: IProduct;

  store: IStore;

  refund: IRefund;

  withdraw_request: IWithdrawRequest;
}

export interface IProduct {
  total_products: number;

  total_approved_products: number;

  total_in_approved_products: number;
}

export interface IStore {
  total_stores: number;

  total_approved_stores: number;

  total_in_approved_stores: number;
}

export interface IRefund {
  total_refunds: number;

  total_pending_refunds: number;

  total_approved_refunds: number;

  total_rejected_refunds: number;
}

export interface IWithdrawRequest {
  total_withdraw_requests: number;

  total_pending_withdraw_requests: number;

  total_approved_withdraw_requests: number;

  total_rejected_withdraw_requests: number;
}
