import { DatePipe, SlicePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { IBlog } from '../../../../shared/interface/blog.interface';

@Component({
  selector: 'app-blog-recent-post',
  imports: [RouterModule, DatePipe, SlicePipe],
  templateUrl: './blog-recent-post.html',
  styleUrl: './blog-recent-post.scss',
})
export class BlogRecentPost {
  readonly blogs = input<IBlog[]>();
}
