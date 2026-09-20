import { Routes } from '@angular/router';

import { Account } from './account';
import { Addresses } from './addresses/addresses';
import { BankDetails } from './bank-details/bank-details';
import { Dashboard } from './dashboard/dashboard';
import { Downloads } from './downloads/downloads';
import { Notifications } from './notifications/notifications';
import { Details } from './order/details/details';
import { Order } from './order/order';
import { Point } from './point/point';
import { Refund } from './refund/refund';
import { Wallet } from './wallet/wallet';

export const account: Routes = [
  {
    path: '',
    component: Account,
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'notifications',
        component: Notifications,
      },
      {
        path: 'bank-details',
        component: BankDetails,
      },
      {
        path: 'wallet',
        component: Wallet,
      },
      {
        path: 'point',
        component: Point,
      },
      {
        path: 'order',
        component: Order,
      },
      {
        path: 'order/details/:id',
        component: Details,
      },
      {
        path: 'downloads',
        component: Downloads,
      },
      {
        path: 'refund',
        component: Refund,
      },
      {
        path: 'addresses',
        component: Addresses,
      },
    ],
  },
];
