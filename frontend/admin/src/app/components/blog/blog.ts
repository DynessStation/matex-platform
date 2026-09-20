import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IBlog, IBlogModel } from '../../shared/interface/blog.interface';
import { IValues } from '../../shared/interface/setting.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllBlogAction,
  DeleteBlogAction,
  GetBlogsAction,
  UpdateBlogStatusAction,
} from '../../shared/store/action/blog.action';
import { BlogState } from '../../shared/store/state/blog.state';
import { SettingState } from '../../shared/store/state/setting.state';

@Component({
  selector: 'app-blog',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog {
  private store = inject(Store);
  router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  blog$: Observable<IBlogModel> = inject(Store).select(BlogState.blog);

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public url: string;

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'image',
        dataField: 'blog_thumbnail',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      { title: 'title', dataField: 'title', sortable: true, sort_direction: 'desc' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'status', dataField: 'status', type: 'switch' },
    ],
    rowActions: [
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'blog.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'blog.destroy',
      },
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' },
    ],
    data: [] as IBlog[],
    total: 0,
  };

  constructor() {
    this.setting$.subscribe(setting => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
      }
    });
  }

  ngOnInit() {
    this.blog$.subscribe(blog => {
      this.tableConfig.data = blog ? blog?.data : [];
      this.tableConfig.total = blog ? blog?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetBlogsAction(data)).subscribe();
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
    else if (action.actionToPerform == 'view') this.view(action.data);
  }

  edit(data: IBlog) {
    void this.router.navigateByUrl(`/blog/edit/${data.id}`);
  }

  status(data: IBlog) {
    this.store.dispatch(new UpdateBlogStatusAction(data.id, data.status));
  }

  delete(data: IBlog) {
    this.store.dispatch(new DeleteBlogAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllBlogAction(ids));
  }

  view(data: IBlog) {
    if (isPlatformBrowser(this.platformId)) {
      window.open(this.url + '/blog/' + data.slug, '_blank');
    }
  }
}
