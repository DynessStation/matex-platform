import { Component } from '@angular/core';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBreadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-order-success',
  imports: [Breadcrumb, HomeNewsletter],
  templateUrl: './order-success.html',
  styleUrl: './order-success.scss',
})
export class OrderSuccess {
  public breadcrumb: IBreadcrumb = {
    title: 'Order Success',
    items: [{ label: 'Order Success', active: true }],
  };
}
