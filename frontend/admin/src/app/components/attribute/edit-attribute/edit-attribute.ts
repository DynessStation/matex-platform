import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormAttribute } from '../form-attribute/form-attribute';

@Component({
  selector: 'app-edit-attribute',
  imports: [PageWrapper, FormAttribute],
  templateUrl: './edit-attribute.html',
  styleUrl: './edit-attribute.scss',
})
export class EditAttribute {}
