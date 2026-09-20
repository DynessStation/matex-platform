import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormBrand } from '../form-brand/form-brand';

@Component({
  selector: 'app-create-brand',
  imports: [PageWrapper, FormBrand],
  templateUrl: './create-brand.html',
  styleUrl: './create-brand.scss',
})
export class CreateBrand {}
