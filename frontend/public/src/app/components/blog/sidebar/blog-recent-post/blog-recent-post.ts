import { DatePipe, SlicePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { IBlog } from '../../../../shared/interface/blog.interface';
import { inject } from '@angular/core';
import { PublicNavigationContextService } from '../../../../shared/services/public-navigation-context.service';

@Component({
  selector: 'app-blog-recent-post',
  imports: [RouterModule, DatePipe, SlicePipe],
  templateUrl: './blog-recent-post.html',
  styleUrl: './blog-recent-post.scss',
})
export class BlogRecentPost {
  private navigation = inject(PublicNavigationContextService);
  readonly blogs = input<IBlog[]>();
  get detailBase(): string {
    return this.navigation.locale() === 'en-US' ? '/en/article' : '/artikel';
  }
}
