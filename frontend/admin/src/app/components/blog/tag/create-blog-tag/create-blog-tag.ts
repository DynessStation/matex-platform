import { Component } from '@angular/core';

import { CreateTag } from '../../../tag/create-tag/create-tag';

@Component({
  selector: 'app-create-blog-tag',
  imports: [CreateTag],
  templateUrl: './create-blog-tag.html',
  styleUrl: './create-blog-tag.scss',
})
export class CreateBlogTag {}
