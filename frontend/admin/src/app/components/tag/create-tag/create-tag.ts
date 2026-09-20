import { Component, input } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormTag } from '../form-tag/form-tag';

@Component({
  selector: 'app-create-tag',
  imports: [PageWrapper, FormTag],
  templateUrl: './create-tag.html',
  styleUrl: './create-tag.scss',
})
export class CreateTag {
  readonly tagType = input<string | null>('product');
}
