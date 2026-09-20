import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormProduct } from '../form-product/form-product';

@Component({
  selector: 'app-create-product',
  imports: [PageWrapper, FormProduct],
  templateUrl: './create-product.html',
  styleUrl: './create-product.scss',
})
export class CreateProduct {}
