import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Button } from '../../../shared/components/button/button';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBreadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-order-tracking',
  imports: [FormsModule, ReactiveFormsModule, Button, TranslateModule, Breadcrumb, HomeNewsletter],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
})
export class OrderTracking {
  public form: FormGroup;

  constructor(
    private store: Store,
    private formBuilder: FormBuilder,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      order_number: new FormControl('', [Validators.required]),
      email_or_phone: new FormControl('', [Validators.required]),
    });
  }

  public breadcrumb: IBreadcrumb = {
    title: 'Order Tracking',
    items: [{ label: 'Order Tracking', active: true }],
  };

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      void this.router.navigate(['account/order'], { queryParams: this.form.value });
    }
  }
}
