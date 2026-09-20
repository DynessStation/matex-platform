import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormTax } from '../form-tax/form-tax';

@Component({
  selector: 'app-edit-tax',
  imports: [PageWrapper, FormTax],
  templateUrl: './edit-tax.html',
  styleUrl: './edit-tax.scss',
})
export class EditTax {}
