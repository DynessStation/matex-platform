import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';

import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { BlogCategory } from './blog-category/blog-category';
import { BlogRecentPost } from './blog-recent-post/blog-recent-post';
import { BlogTag } from './blog-tag/blog-tag';
import { IBlog } from '../../../shared/interface/blog.interface';
import { Category, CategoryModel } from '../../../shared/interface/category.interface';
import { TagModel } from '../../../shared/interface/tag.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { GetRecentBlogAction } from '../../../shared/store/action/blog.action';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetTags } from '../../../shared/store/action/tag.action';
import { BlogState } from '../../../shared/store/state/blog.state';
import { CategoryState } from '../../../shared/store/state/category.state';
import { TagState } from '../../../shared/store/state/tag.state';

@Component({
  selector: 'app-sidebar',
  imports: [BlogRecentPost, BlogCategory, BlogTag, NgbAccordionModule, AsyncPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  blogService = inject(BlogService);
  private store = inject(Store);
  @Input() showSidebar: boolean = false;

  resentBlog$: Observable<IBlog[]> = inject(Store).select(BlogState.resentBlog) as Observable<
    IBlog[]
  >;
  tag$: Observable<TagModel> = inject(Store).select(TagState.tag) as Observable<TagModel>;
  category$: Observable<CategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<CategoryModel>;

  constructor() {
    this.store.dispatch(new GetTags({ status: 1, type: 'post' }));
    this.store.dispatch(new GetRecentBlogAction({ status: 1, type: 'post', paginate: '5' }));
    this.store.dispatch(new GetCategories({ status: 1, type: 'post' }));
  }

  closeSidebar() {
    this.showSidebar = false;
  }
}
