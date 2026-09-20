import { Routes } from '@angular/router';

import { AuthGuard } from 'src/app/core/guard/auth.guard';

export const content: Routes = [
  {
    path: 'dashboard',

    canActivate: [AuthGuard],

    loadChildren: () => import('../../components/dashboard/dashboard.routes'),
  },

  {
    path: 'admin-account',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/admin-account/admin-account.routes').then(
        (r) => r.adminAccountRoutes,
      ),
  },
  {
    path: 'admin-permission',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/admin-permission/admin-permission.routes').then(
        (r) => r.adminPermissionRoutes,
      ),
  },
  {
    path: 'admin-access',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/admin-access/admin-access.routes').then(
        (routes) => routes.adminAccessRoutes,
      ),
  },
  {
    path: 'activity-log',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/activity-log/activity-log.routes').then(
        (routes) => routes.activityLogRoutes,
      ),
  },
  {
    path: 'chair',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/chair/chair.routes').then(
        (routes) => routes.chairRoutes,
      ),
  },
  {
    path: 'office',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/office/office.routes').then(
        (routes) => routes.officeRoutes,
      ),
  },

  //==================================================
  //==== CMS PAGE
  //==================================================

  {
    path: 'cms-page',

    canActivate: [AuthGuard],

    loadChildren: () =>
      import('../../components/cms-page/cms-page.routes').then(
        (routes) => routes.cmsPageRoutes,
      ),
  },

  {
    path: 'account',

    loadChildren: () =>
      import('../../components/account/account.routes').then(
        (r) => r.accountRoutes,
      ),
  },

  {
    path: 'user',

    loadChildren: () =>
      import('../../components/user/user.routes').then((r) => r.userRoutes),
  },

  {
    path: 'role',

    loadChildren: () =>
      import('../../components/role/role.routes').then((r) => r.roleRoutes),
  },

  {
    path: 'product',

    loadChildren: () =>
      import('../../components/product/product.routes').then(
        (r) => r.productRoutes,
      ),
  },

  {
    path: 'attribute',

    loadChildren: () =>
      import('../../components/attribute/attribute.routes').then(
        (r) => r.attributeRoutes,
      ),
  },

  {
    path: 'category',

    loadChildren: () =>
      import('../../components/category/category.routes').then(
        (r) => r.categoryRoutes,
      ),
  },

  {
    path: 'tag',

    loadChildren: () =>
      import('../../components/tag/tag.routes').then((r) => r.tagRoutes),
  },

  {
    path: 'brand',

    loadChildren: () =>
      import('../../components/brand/brand.routes').then((r) => r.brandRoutes),
  },

  {
    path: 'qna',

    loadChildren: () =>
      import('../../components/questions-answers/questions-answers.routes').then(
        (r) => r.questionAnswersRoutes,
      ),
  },

  {
    path: 'license-key',

    loadChildren: () =>
      import('../../components/license-key/license-key.routes').then(
        (r) => r.licenseKeyRoutes,
      ),
  },

  {
    path: 'store',

    loadChildren: () =>
      import('../../components/store/stores.routes').then((r) => r.storeRoutes),
  },

  {
    path: 'wallet',

    loadChildren: () =>
      import('../../components/wallet/wallet.routes').then(
        (r) => r.walletRoutes,
      ),
  },

  {
    path: 'commission',

    loadChildren: () =>
      import('../../components/commission/commission.routes').then(
        (r) => r.commissionRoutes,
      ),
  },

  {
    path: 'withdrawal',

    loadChildren: () =>
      import('../../components/withdrawal/withdrawal.routes').then(
        (r) => r.withdrawalRoutes,
      ),
  },

  {
    path: 'payment-details',

    loadChildren: () =>
      import('../../components/payout-details/payout-details.routes').then(
        (r) => r.payoutDetailsRoutes,
      ),
  },

  {
    path: 'order',

    loadChildren: () =>
      import('../../components/order/order.routes').then((r) => r.orderRoutes),
  },

  {
    path: 'media',

    loadChildren: () =>
      import('../../components/media/media.routes').then((r) => r.mediaRoutes),
  },

  {
    path: 'blog',

    loadChildren: () =>
      import('../../components/blog/blog.routes').then((r) => r.blogRoutes),
  },

  {
    path: 'page',

    loadChildren: () =>
      import('../../components/page/page.routes').then((r) => r.pageRoutes),
  },

  {
    path: 'tax',

    loadChildren: () =>
      import('../../components/tax/tax.routes').then((r) => r.taxRoutes),
  },

  {
    path: 'shipping',

    loadChildren: () =>
      import('../../components/shipping/shipping.routes').then(
        (r) => r.shippingRoutes,
      ),
  },

  {
    path: 'coupon',

    loadChildren: () =>
      import('../../components/coupon/coupon.routes').then(
        (r) => r.couponRoutes,
      ),
  },

  {
    path: 'currency',

    loadChildren: () =>
      import('../../components/currency/currency.routes').then(
        (r) => r.currencyRoutes,
      ),
  },

  {
    path: 'point',

    loadChildren: () =>
      import('../../components/point/point.routes').then((r) => r.pointRoutes),
  },

  {
    path: 'vendor-wallet',

    loadChildren: () =>
      import('../../components/vendor-wallet/vendor-wallet.routes').then(
        (r) => r.vendorWalletRoutes,
      ),
  },

  {
    path: 'refund',

    loadChildren: () =>
      import('../../components/refund/refund.routes').then(
        (r) => r.refundRoutes,
      ),
  },

  {
    path: 'review',

    loadChildren: () =>
      import('../../components/review/review.routes').then(
        (r) => r.reviewRoutes,
      ),
  },

  {
    path: 'faq',

    loadChildren: () =>
      import('../../components/faq/faq.routes').then((r) => r.faqRoutes),
  },

  {
    path: 'notification',

    loadChildren: () =>
      import('../../components/notification/notification.routes').then(
        (r) => r.notificationRoutes,
      ),
  },

  {
    path: 'notice',

    loadChildren: () =>
      import('../../components/notice/notice.routes').then(
        (r) => r.noticeRoutes,
      ),
  },

  {
    path: 'subscription',

    loadChildren: () =>
      import('../../components/subscription/subscription.routes').then(
        (r) => r.subscriptionRoutes,
      ),
  },

  {
    path: 'theme',

    loadChildren: () =>
      import('../../components/theme/theme.routes').then((r) => r.themeRoutes),
  },

  {
    path: 'theme-option',

    loadChildren: () =>
      import('../../components/theme-option/theme-option.routes').then(
        (r) => r.themeOptionRoutes,
      ),
  },

  {
    path: 'menu',

    loadChildren: () =>
      import('../../components/menu/menu.routes').then((r) => r.MenuRoutes),
  },

  {
    path: 'setting',

    loadChildren: () =>
      import('../../components/setting/setting.routes').then(
        (r) => r.SettingRoutes,
      ),
  },
];
