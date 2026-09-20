import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormCurrency } from '../form-currency/form-currency';

@Component({
  selector: 'app-edit-currency',
  imports: [PageWrapper, FormCurrency],
  templateUrl: './edit-currency.html',
  styleUrl: './edit-currency.scss',
})
export class EditCurrency {}
