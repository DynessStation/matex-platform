import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IBlog } from '../../interface/blog.interface';
import { BlogService } from '../../services/blog.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetBlogsAction,
  CreateBlogAction,
  EditBlogAction,
  UpdateBlogAction,
  UpdateBlogStatusAction,
  DeleteBlogAction,
  DeleteAllBlogAction,
} from '../action/blog.action';

export class BlogStateModel {
  blog = {
    data: [] as IBlog[],
    total: 0,
  };
  selectedBlog: IBlog | null;
}

@State<BlogStateModel>({
  name: 'blog',
  defaults: {
    blog: {
      data: [],
      total: 0,
    },
    selectedBlog: null,
  },
})
@Injectable()
export class BlogState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private blogService = inject(BlogService);

  @Selector()
  static blog(state: BlogStateModel) {
    return state.blog;
  }

  @Selector()
  static blogs(state: BlogStateModel) {
    return state.blog.data.map(res => {
      return { label: res?.title, value: res?.id };
    });
  }

  @Selector()
  static selectedBlog(state: BlogStateModel) {
    return state.selectedBlog;
  }

  @Action(GetBlogsAction)
  getBlogs(ctx: StateContext<BlogStateModel>, action: GetBlogsAction) {
    return this.blogService.getBlogs(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            blog: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateBlogAction)
  create(_ctx: StateContext<BlogStateModel>, _action: CreateBlogAction) {
    // Create Blog Login Here
  }

  @Action(EditBlogAction)
  edit(ctx: StateContext<BlogStateModel>, { id }: EditBlogAction) {
    return this.blogService.getBlogs().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(blog => blog.id == id);
          ctx.patchState({
            ...state,
            selectedBlog: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateBlogAction)
  update(_ctx: StateContext<BlogStateModel>, { payload: _payload, id: _id }: UpdateBlogAction) {
    // Update Blog Logic Here
  }

  @Action(UpdateBlogStatusAction)
  updateStatus(
    _ctx: StateContext<BlogStateModel>,
    { id: _id, status: _status }: UpdateBlogStatusAction,
  ) {
    //  Update Blog Status Logic Here
  }

  @Action(DeleteBlogAction)
  delete(_ctx: StateContext<BlogStateModel>, { id: _id }: DeleteBlogAction) {
    // Delete Blog Logic Here
  }

  @Action(DeleteAllBlogAction)
  deleteAll(_ctx: StateContext<BlogStateModel>, { ids: _ids }: DeleteAllBlogAction) {
    // Delete All Blog Logic Here
  }
}
