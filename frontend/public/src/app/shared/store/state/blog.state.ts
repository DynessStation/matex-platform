import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IBlog } from '../../interface/blog.interface';
import { BlogService } from '../../services/blog.service';
import {
  GetBlogBySlugAction,
  GetBlogsAction,
  GetRecentBlogAction,
  GetSelectedBlogsAction,
} from '../action/blog.action';

export class BlogStateModel {
  blog = {
    data: [] as IBlog[],
    total: 0,
  };
  selectedBlog: IBlog | null;
  recentBlog: IBlog[] | [];
  selectedBlogs: IBlog[] | [];
}

@State<BlogStateModel>({
  name: 'blog',
  defaults: {
    blog: {
      data: [],
      total: 0,
    },
    selectedBlog: null,
    recentBlog: [],
    selectedBlogs: [],
  },
})
@Injectable()
export class BlogState {
  private router = inject(Router);
  private blogService = inject(BlogService);

  @Selector()
  static blog(state: BlogStateModel) {
    return state.blog;
  }

  @Selector()
  static selectedBlog(state: BlogStateModel) {
    return state.selectedBlog;
  }

  @Selector()
  static resentBlog(state: BlogStateModel) {
    return state.recentBlog;
  }

  @Selector()
  static selectedBlogs(state: BlogStateModel) {
    return state.selectedBlogs;
  }

  @Action(GetBlogsAction)
  getBlogs(ctx: StateContext<BlogStateModel>, action: GetBlogsAction) {
    this.blogService.skeletonLoader = true;
    return this.blogService.getBlogs(action.locale, action.payload).pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            blog: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        complete: () => {
          this.blogService.skeletonLoader = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetBlogBySlugAction)
  getBlogBySlug(ctx: StateContext<BlogStateModel>, action: GetBlogBySlugAction) {
    const { slug } = action;
    return this.blogService.getBlogBySlug(action.locale, slug).pipe(
      tap({
        next: (result) => {
          ctx.patchState({ selectedBlog: result });
        },
        error: (err) => {
          void this.router.navigate(['/404']);
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetRecentBlogAction)
  getRecentBlogs(ctx: StateContext<BlogStateModel>, action: GetRecentBlogAction) {
    return this.blogService.getBlogs(action.locale, action.payload).pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            recentBlog: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetSelectedBlogsAction)
  getSelectedBlogs(ctx: StateContext<BlogStateModel>, action: GetSelectedBlogsAction) {
    return this.blogService.getBlogs(action.locale, action.payload).pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            selectedBlogs: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
