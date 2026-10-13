import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { HasPermissionDirective } from '../../../../directive/has-permission.directive';

@Component({
  selector: 'app-quick-view',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, NgbModule],
  templateUrl: './quick-view.html',
  styleUrl: './quick-view.scss',
})
export class QuickView {
  public quickLink = [
    {
      title: 'add_product',
      path: '/product/create',
      icon: 'ri-store-3-line',
      permission: 'product.create',
    },
    {
      title: 'add_blog',
      path: '/blog/create',
      icon: 'ri-article-line',
      permission: 'article.create',
    },
    {
      title: 'media',
      path: '/media',
      icon: 'ri-image-line',
      permission: 'attachment.view',
    },
  ];
}
