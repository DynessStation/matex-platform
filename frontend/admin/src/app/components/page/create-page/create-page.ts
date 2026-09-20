import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormPage } from '../form-page/form-page';

@Component({
  selector: 'app-create-page',
  imports: [PageWrapper, FormPage],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
})
export class CreatePage {}
