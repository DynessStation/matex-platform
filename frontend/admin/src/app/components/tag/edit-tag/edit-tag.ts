import { Component, input } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormTag } from '../form-tag/form-tag';

@Component({
  selector: 'app-edit-tag',
  imports: [PageWrapper, FormTag],
  templateUrl: './edit-tag.html',
  styleUrl: './edit-tag.scss',
})
export class EditTag {
  readonly tagType = input<string | null>('product');
}
