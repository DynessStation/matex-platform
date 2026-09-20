import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormBrand } from '../form-brand/form-brand';

@Component({
  selector: 'app-edit-brand',
  imports: [PageWrapper, FormBrand],
  templateUrl: './edit-brand.html',
  styleUrl: './edit-brand.scss',
})
export class EditBrand {}
