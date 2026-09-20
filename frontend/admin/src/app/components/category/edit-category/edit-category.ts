import { Component, input } from '@angular/core';

import { Category } from '../category';

@Component({
  selector: 'app-edit-category',
  imports: [Category],
  templateUrl: './edit-category.html',
  styleUrl: './edit-category.scss',
})
export class EditCategory {
  readonly categoryType = input<string | null>('product');
}
