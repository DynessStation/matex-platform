import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormAttribute } from '../form-attribute/form-attribute';

@Component({
  selector: 'app-create-attribute',
  imports: [PageWrapper, FormAttribute],
  templateUrl: './create-attribute.html',
  styleUrl: './create-attribute.scss',
})
export class CreateAttribute {}
