import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormCurrency } from '../form-currency/form-currency';

@Component({
  selector: 'app-create-currency',
  imports: [PageWrapper, FormCurrency],
  templateUrl: './create-currency.html',
  styleUrl: './create-currency.scss',
})
export class CreateCurrency {}
