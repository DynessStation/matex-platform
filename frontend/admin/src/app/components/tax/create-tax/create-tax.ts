import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormTax } from '../form-tax/form-tax';

@Component({
  selector: 'app-create-tax',
  imports: [PageWrapper, FormTax],
  templateUrl: './create-tax.html',
  styleUrl: './create-tax.scss',
})
export class CreateTax {}
