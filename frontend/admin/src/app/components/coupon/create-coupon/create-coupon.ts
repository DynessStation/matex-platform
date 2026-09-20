import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormCoupon } from '../form-coupon/form-coupon';

@Component({
  selector: 'app-create-coupon',
  imports: [PageWrapper, FormCoupon],
  templateUrl: './create-coupon.html',
  styleUrl: './create-coupon.scss',
})
export class CreateCoupon {}
