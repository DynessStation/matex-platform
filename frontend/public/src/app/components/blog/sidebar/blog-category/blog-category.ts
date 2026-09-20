import { NgTemplateOutlet, SlicePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Category } from '../../../../shared/interface/category.interface';

@Component({
  selector: 'app-blog-category',
  imports: [RouterModule, NgTemplateOutlet, SlicePipe],
  templateUrl: './blog-category.html',
  styleUrl: './blog-category.scss',
})
export class BlogCategory {
  readonly data = input<Category[]>();
}
