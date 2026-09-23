import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { forkJoin, tap } from 'rxjs';
import { IArticleDetail, IBlogModel } from '../../interface/blog.interface';
import { ApiMessageService } from '../../services/api-message.service';
import { BlogService } from '../../services/blog.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateBlogAction,
  DeleteAllBlogAction,
  DeleteBlogAction,
  EditBlogAction,
  GetBlogsAction,
  UpdateBlogAction,
  UpdateBlogStatusAction,
} from '../action/blog.action';
export interface BlogStateModel {
  blog: IBlogModel;
  selectedBlog: IArticleDetail | null;
}
@State<BlogStateModel>({
  name: 'blog',
  defaults: { blog: { data: [], total: 0 }, selectedBlog: null },
})
@Injectable()
export class BlogState {
  private service = inject(BlogService);
  private notes = inject(NotificationService);
  private messages = inject(ApiMessageService);
  @Selector() static blog(s: BlogStateModel) {
    return s.blog;
  }
  @Selector() static blogs(s: BlogStateModel) {
    return s.blog.data.map((x) => ({ label: x.title, value: x.id }));
  }
  @Selector() static selectedBlog(s: BlogStateModel) {
    return s.selectedBlog;
  }
  @Action(GetBlogsAction) get(
    ctx: StateContext<BlogStateModel>,
    a: GetBlogsAction,
  ) {
    return this.service
      .getBlogs(a.payload)
      .pipe(tap((v) => ctx.patchState({ blog: v })));
  }
  @Action(EditBlogAction) edit(
    ctx: StateContext<BlogStateModel>,
    a: EditBlogAction,
  ) {
    ctx.patchState({ selectedBlog: null });
    return this.service
      .getBlog(a.id)
      .pipe(tap((v) => ctx.patchState({ selectedBlog: v.data ?? null })));
  }
  @Action(CreateBlogAction) create(
    _: StateContext<BlogStateModel>,
    a: CreateBlogAction,
  ) {
    return this.service
      .create(a.payload)
      .pipe(
        tap((v) => this.notes.showSuccess(this.messages.resolveResponse(v))),
      );
  }
  @Action(UpdateBlogAction) update(
    _: StateContext<BlogStateModel>,
    a: UpdateBlogAction,
  ) {
    return this.service
      .update(a.id, a.payload)
      .pipe(
        tap((v) => this.notes.showSuccess(this.messages.resolveResponse(v))),
      );
  }
  @Action(UpdateBlogStatusAction) status(
    _: StateContext<BlogStateModel>,
    a: UpdateBlogStatusAction,
  ) {
    return this.service
      .updateStatus(a.id, a.status)
      .pipe(
        tap((v) => this.notes.showSuccess(this.messages.resolveResponse(v))),
      );
  }
  @Action(DeleteBlogAction) delete(
    _: StateContext<BlogStateModel>,
    a: DeleteBlogAction,
  ) {
    return this.service
      .delete(a.id)
      .pipe(
        tap((v) => this.notes.showSuccess(this.messages.resolveResponse(v))),
      );
  }
  @Action(DeleteAllBlogAction) deleteAll(
    _: StateContext<BlogStateModel>,
    a: DeleteAllBlogAction,
  ) {
    return forkJoin(a.ids.map((id) => this.service.delete(id))).pipe(
      tap(() => this.notes.showSuccess('Articles moved to trash')),
    );
  }
}
