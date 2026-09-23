import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { BlogRecentPost } from './blog-recent-post/blog-recent-post';
import { IBlog } from '../../../shared/interface/blog.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { GetRecentBlogAction } from '../../../shared/store/action/blog.action';
import { BlogState } from '../../../shared/store/state/blog.state';
@Component({
  selector: 'app-sidebar',
  imports: [BlogRecentPost, NgbAccordionModule, AsyncPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  blogService = inject(BlogService);
  private store = inject(Store);
  private navigation = inject(PublicNavigationContextService);
  @Input() showSidebar = false;
  resentBlog$: Observable<IBlog[]> = inject(Store).select(BlogState.resentBlog) as Observable<
    IBlog[]
  >;
  get recentTitle(): string {
    return this.navigation.locale() === 'en-US' ? 'Recent articles' : 'Artikel terbaru';
  }
  constructor() {
    this.store.dispatch(new GetRecentBlogAction({ paginate: '5' }, this.navigation.locale()));
  }
  closeSidebar() {
    this.showSidebar = false;
  }
}
