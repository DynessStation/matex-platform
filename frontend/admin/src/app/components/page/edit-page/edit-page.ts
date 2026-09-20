import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormPage } from '../form-page/form-page';

@Component({
  selector: 'app-edit-page',
  imports: [PageWrapper, FormPage],
  templateUrl: './edit-page.html',
  styleUrl: './edit-page.scss',
})
export class EditPage {}
