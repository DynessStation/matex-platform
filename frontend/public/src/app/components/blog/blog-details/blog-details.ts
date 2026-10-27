import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, Observable } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBlog } from '../../../shared/interface/blog.interface';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { resolvedMissing } from '../../../shared/resolver/resolved-missing';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { PublicSeoAlternate, PublicSeoService } from '../../../shared/services/public-seo.service';
import { BlogState } from '../../../shared/store/state/blog.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { Error404 } from '../../page/error-404/error-404';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-blog-details',
  imports: [Sidebar, HomeNewsletter, Breadcrumb, AsyncPipe, DatePipe, Error404],
  templateUrl: './blog-details.html',
  styleUrl: './blog-details.scss',
})
export class BlogDetails {
  // Nothing found by the resolver: show the 404 view (status 404) instead.
  readonly missing = resolvedMissing();

  private route = inject(ActivatedRoute);
  private navigation = inject(PublicNavigationContextService);
  private seo = inject(PublicSeoService);
  private destroyRef = inject(DestroyRef);

  blog$: Observable<IBlog> = inject(Store).select(BlogState.selectedBlog) as Observable<IBlog>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = { title: '', items: [] };
  public open = false;
  public sidebar = 'left_sidebar';

  get locale(): string {
    return this.navigation.locale();
  }

  get articleLabel(): string {
    return this.locale === 'en-US' ? 'Articles' : 'Artikel';
  }

  constructor() {
    // Route data too: the article may load before the resolver's answer reaches the route.
    combineLatest([this.blog$, this.route.data])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([blog, data]) => {
        if (!blog || data['data'] === false) return;
        this.breadcrumb = {
          title: blog.title,
          items: [
            {
              label: this.articleLabel,
              url: this.locale === 'en-US' ? '/en/articles' : '/artikel',
              active: false,
            },
            { label: blog.title, active: true },
          ],
        };
        this.applySeo(blog);
      });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['sidebar']) {
        this.sidebar = params['sidebar'];
      }
    });

    this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((theme) => {
      if (!this.route.snapshot.queryParamMap.has('sidebar')) {
        this.sidebar = theme?.blog?.blog_sidebar_type || 'left_sidebar';
      }
    });

    this.destroyRef.onDestroy(() => this.seo.clear());
  }

  filterOpen() {
    this.open = !this.open;
  }

  private applySeo(blog: IBlog): void {
    const locale: 'id-ID' | 'en-US' = this.locale === 'en-US' ? 'en-US' : 'id-ID';
    const title = blog.meta_title || blog.title;
    const description = blog.meta_description || blog.description || '';
    const currentPath = `${locale === 'en-US' ? '/en/article/' : '/artikel/'}${encodeURIComponent(blog.slug)}`;
    const canonical = this.seo.canonicalUrl(currentPath, blog.canonical_url);
    const image = blog.blog_meta_image?.asset_url || blog.blog_thumbnail?.asset_url || '';
    const alternates: PublicSeoAlternate[] = [
      {
        locale: 'id-ID',
        path: `/artikel/${encodeURIComponent(blog.localized_slugs?.['id-ID'] || blog.slug)}`,
      },
      {
        locale: 'en-US',
        path: `/en/article/${encodeURIComponent(blog.localized_slugs?.['en-US'] || blog.slug)}`,
      },
    ];

    const schema =
      blog.schema_json ||
      ({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.title,
        description,
        image: image || undefined,
        datePublished: blog.created_at,
        dateModified: blog.updated_at || blog.created_at,
        author: { '@type': 'Organization', name: blog.created_by?.name || 'MATEX' },
        mainEntityOfPage: canonical,
      } as Record<string, unknown>);

    this.seo.apply({
      locale,
      title,
      description,
      canonicalPath: currentPath,
      canonicalUrl: canonical,
      alternates,
      type: 'article',
      socialTitle: blog.og_title || title,
      socialDescription: blog.og_description || description,
      image,
      schema,
    });
  }
}
