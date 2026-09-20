import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormBlog } from '../form-blog/form-blog';

@Component({
  selector: 'app-edit-blog',
  imports: [PageWrapper, FormBlog],
  templateUrl: './edit-blog.html',
  styleUrl: './edit-blog.scss',
})
export class EditBlog {}
