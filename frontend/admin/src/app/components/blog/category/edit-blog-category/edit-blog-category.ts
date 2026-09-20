import { Component } from '@angular/core';

import { EditCategory } from '../../../category/edit-category/edit-category';

@Component({
  selector: 'app-edit-blog-category',
  imports: [EditCategory],
  templateUrl: './edit-blog-category.html',
  styleUrl: './edit-blog-category.scss',
})
export class EditBlogCategory {}
