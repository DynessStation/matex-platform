import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { NoData } from '../../../../../../shared/components/no-data/no-data';
import { Product } from '../../../../../../shared/interface/product.interface';
import { Review } from '../../../../../../shared/interface/review.interface';

@Component({
  selector: 'app-product-review',
  imports: [NoData, NgbRatingModule, TranslateModule, DatePipe],
  templateUrl: './product-review.html',
  styleUrl: './product-review.scss',
})
export class ProductReview {
  product = input<Product | null>();
  reviews = input<Review[]>([]);
}
