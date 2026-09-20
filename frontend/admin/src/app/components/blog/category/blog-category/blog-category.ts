import { Component } from '@angular/core';

import { Category } from '../../../category/category';

@Component({
  selector: 'app-blog-category',
  imports: [Category],
  templateUrl: './blog-category.html',
  styleUrl: './blog-category.scss',
})
export class BlogCategory {}
