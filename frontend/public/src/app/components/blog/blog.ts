import { isPlatformBrowser, DatePipe, NgClass, AsyncPipe } from '@angular/common';
import { Component, DestroyRef, Inject, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from './sidebar/sidebar';
import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBlog, IBlogModel } from '../../shared/interface/blog.interface';
import { breadcrumb } from '../../shared/interface/breadcrumb.interface';
import { Option } from '../../shared/interface/theme-option.interface';
import { BlogService } from '../../shared/services/blog.service';
import { GetBlogsAction } from '../../shared/store/action/blog.action';
import { BlogState } from '../../shared/store/state/blog.state';
import { ThemeOptionState } from '../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../home/widgets/home-newsletter/home-newsletter';
import { PublicNavigationContextService } from '../../shared/services/public-navigation-context.service';
import { NoData } from '../../shared/components/no-data/no-data';

@Component({
  selector: 'app-blog',
  imports: [
    Sidebar,
    RouterModule,
    NgbPagination,
    HomeNewsletter,
    Breadcrumb,
    DatePipe,
    NgClass,
    AsyncPipe,
    NoData,
  ],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  blogService = inject(BlogService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigation = inject(PublicNavigationContextService);
  public isBrowser = false;

  blog$: Observable<IBlogModel> = inject(Store).select(BlogState.blog) as Observable<IBlogModel>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: '',
    items: [],
  };

  public filter = {
    page: 1, // Current page number
    paginate: 12, // Display per page,
    status: 1,
    category: '',
    tag: '',
  };

  public skeletonItems = Array.from({ length: 9 }, (_, index) => index);
  public totalItems: number = 0;
  public style: string = 'grid_view';
  public sidebar: string = 'left_sidebar';
  public open: boolean = false;
  get detailBase(): string {
    return this.navigation.locale() === 'en-US' ? '/en/article' : '/artikel';
  }
  get locale(): string {
    return this.navigation.locale();
  }
  get filterLabel(): string {
    return this.locale === 'en-US' ? 'Filter articles' : 'Filter artikel';
  }
  get readMoreLabel(): string {
    return this.locale === 'en-US' ? 'Read more' : 'Baca selengkapnya';
  }

  public paginateBlog$: Observable<IBlog[]> = this.blog$.pipe(map((result) => result?.data || []));

  public totalItems$: Observable<number> = this.blog$.pipe(map((blog) => blog?.total || 0));

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filter.category = params['category'] ? params['category'] : '';
      this.filter.tag = params['tag'] ? params['tag'] : '';
      this.filter.page = params['page'] ? Number(params['page']) : 1;

      this.store.dispatch(new GetBlogsAction(this.filter, this.navigation.locale()));

      if (params['style']) {
        this.style = params['style'];
      }

      if (params['sidebar']) {
        this.sidebar = params['sidebar'];
      }

      if (!params['style'] && !params['sidebar']) {
        this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((theme) => {
          this.style = theme?.blog?.blog_style;
          this.sidebar = theme?.blog?.blog_sidebar_type;
        });
      }
      this.setBreadcrumb();
    });
  }

  filterOpen() {
    this.open = !this.open;
  }

  setPaginate(data: number) {
    this.filter.page = data;
    this.store.dispatch(new GetBlogsAction(this.filter, this.navigation.locale()));

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.filter.page,
      },
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });
  }

  setPage() {
    // Logic moved to paginateBlog$ and setPaginate
  }

  setBreadcrumb() {
    const layoutParam = this.route.snapshot.queryParamMap.get('style');
    const title = this.navigation.locale() === 'en-US' ? 'Articles' : 'Artikel';
    this.breadcrumb.title = title;
    this.breadcrumb.items = [{ label: title, active: true }];
    if (layoutParam) {
      this.breadcrumb.title = layoutParam;
      this.breadcrumb.items = [{ label: layoutParam }];
    }
  }
}
