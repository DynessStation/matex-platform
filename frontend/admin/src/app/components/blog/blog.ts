import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, map, skip } from 'rxjs';

import { BlogInsight } from './blog-insight/blog-insight';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { InsightToggle } from '../../shared/components/ui/insight/insight-toggle';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { IBlog, IBlogModel } from '../../shared/interface/blog.interface';
import { IValues } from '../../shared/interface/setting.interface';
import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';
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
  imports: [
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    BlogInsight,
    InsightToggle,
  ],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog {
  private store = inject(Store);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly insightOpen = signal(true);
  /** The insight band's "Perbaiki" lands here with ?audit=. */
  private readonly audit$ = this.route.queryParamMap.pipe(
    map((params) => params.get('audit') ?? ''),
  );
  readonly audit = toSignal(this.audit$, { initialValue: '' });
  private tableParams: Params = {};
  private platformId = inject(PLATFORM_ID);

  blog$: Observable<IBlogModel> = inject(Store).select(BlogState.blog);

  setting$: Observable<IValues> = inject(Store).select(
    SettingState.setting,
  ) as Observable<IValues>;

  public url: string;

  public tableConfig: ITableConfig<IBlog> = {
    columns: [
      {
        title: 'image',
        dataField: 'blog_thumbnail',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      {
        title: 'title',
        dataField: 'title',
        sortable: true,
        sort_direction: 'desc',
      },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'status', dataField: 'status' },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'article.update',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'article.delete',
      },
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' },
    ],
    data: [] as IBlog[],
    total: 0,
  };

  constructor() {
    this.setting$.subscribe((setting) => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
      }
    });
  }

  ngOnInit() {
    // A "Perbaiki" link clicked, or the filter cleared: the table itself does not change.
    this.audit$.pipe(skip(1)).subscribe(() => this.loadList());
    this.blog$.subscribe((blog) => {
      this.tableConfig.data = blog ? blog?.data : [];
      this.tableConfig.total = blog?.meta.total ?? 0;
      this.tableConfig.total_all = blog?.meta.total_all;
    });
  }

  onTableChange(data?: Params) {
    this.tableParams = data ?? {};
    this.loadList();
  }

  private loadList() {
    const audit = this.audit();
    this.store
      .dispatch(
        new GetBlogsAction({
          ...this.tableParams,
          audit: audit || undefined,
        }),
      )
      .subscribe();
  }

  clearAudit() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { audit: null },
      queryParamsHandling: 'merge',
    });
  }

  onActionClicked(action: ITableClickedAction<IBlog>) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll')
      this.deleteAll((action.ids ?? []).map(String));
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

  deleteAll(ids: string[]) {
    this.store.dispatch(new DeleteAllBlogAction(ids));
  }

  view(data: IBlog) {
    if (isPlatformBrowser(this.platformId)) {
      window.open(
        `${this.url.replace(/\/$/, '')}/artikel/${data.slug}`,
        '_blank',
      );
    }
  }
}
