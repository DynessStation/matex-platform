import { isPlatformBrowser, DatePipe, NgClass, AsyncPipe } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, Inject, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { finalize, map, Observable } from 'rxjs';

import { Sidebar } from './sidebar/sidebar';
import { Loader } from '../../shared/components/loader/loader';
import { NoData } from '../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBlog, IBlogModel } from '../../shared/interface/blog.interface';
import { breadcrumb } from '../../shared/interface/breadcrumb.interface';
import { Option } from '../../shared/interface/theme-option.interface';
import { BlogService } from '../../shared/services/blog.service';
import { PublicNavigationContextService } from '../../shared/services/public-navigation-context.service';
import { PublicSeoService } from '../../shared/services/public-seo.service';
import { GetBlogsAction } from '../../shared/store/action/blog.action';
import { BlogState } from '../../shared/store/state/blog.state';
import { ThemeOptionState } from '../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../home/widgets/home-newsletter/home-newsletter';

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
    Loader,
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
  private document = inject(DOCUMENT);
  private navigation = inject(PublicNavigationContextService);
  private seo = inject(PublicSeoService);
  private originalLang = this.document.documentElement.lang;
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
  readonly loading = signal(true);
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const locale: 'id-ID' | 'en-US' =
      this.navigation.locale() === 'en-US' ? 'en-US' : 'id-ID';
    this.seo.apply({
      locale,
      title: locale === 'en-US' ? 'Articles | MATEX' : 'Artikel | MATEX',
      description:
        locale === 'en-US'
          ? 'Read MATEX articles about natural latex products, their use, and related insights.'
          : 'Baca artikel MATEX tentang produk lateks alami, penggunaannya, dan wawasan terkait.',
      canonicalPath: locale === 'en-US' ? '/en/articles' : '/artikel',
      alternates: [
        { locale: 'id-ID', path: '/artikel' },
        { locale: 'en-US', path: '/en/articles' },
      ],
      type: 'website',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: locale === 'en-US' ? 'MATEX Articles' : 'Artikel MATEX',
        url: this.seo.publicUrl(locale === 'en-US' ? '/en/articles' : '/artikel'),
        inLanguage: locale,
      },
    });
    this.destroyRef.onDestroy(() => {
      this.seo.clear();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((theme) => {
      if (!this.route.snapshot.queryParamMap.has('style')) {
        this.style = theme?.blog?.blog_style || 'grid_view';
      }
      if (!this.route.snapshot.queryParamMap.has('sidebar')) {
        this.sidebar = theme?.blog?.blog_sidebar_type || 'left_sidebar';
      }
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filter.category = params['category'] ? params['category'] : '';
      this.filter.tag = params['tag'] ? params['tag'] : '';
      this.filter.page = params['page'] ? Number(params['page']) : 1;

      this.loading.set(true);
      this.store
        .dispatch(new GetBlogsAction(this.filter, this.navigation.locale()))
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({ error: () => undefined });

      if (params['style']) {
        this.style = params['style'];
      }

      if (params['sidebar']) {
        this.sidebar = params['sidebar'];
      }

      this.setBreadcrumb();
    });
  }

  filterOpen() {
    this.open = !this.open;
  }

  setPaginate(data: number) {
    this.filter.page = data;
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
    const title = this.navigation.locale() === 'en-US' ? 'Articles' : 'Artikel';
    this.breadcrumb.title = title;
    this.breadcrumb.items = [{ label: title, active: true }];
  }
}
