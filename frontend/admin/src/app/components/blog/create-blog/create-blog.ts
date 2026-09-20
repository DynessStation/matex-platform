import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormBlog } from '../form-blog/form-blog';

@Component({
  selector: 'app-create-blog',
  imports: [PageWrapper, FormBlog],
  templateUrl: './create-blog.html',
  styleUrl: './create-blog.scss',
})
export class CreateBlog {}
