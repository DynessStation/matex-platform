import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBlog } from '../../../shared/interface/blog.interface';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { BlogState } from '../../../shared/store/state/blog.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-blog-details',
  imports: [Sidebar, HomeNewsletter, Breadcrumb, AsyncPipe, DatePipe],
  templateUrl: './blog-details.html',
  styleUrl: './blog-details.scss',
})
export class BlogDetails {
  private route = inject(ActivatedRoute);
  private navigation = inject(PublicNavigationContextService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
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
    this.blog$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((blog) => {
      if (!blog) return;
      this.breadcrumb = {
        title: blog.title,
        items: [
          { label: this.articleLabel, active: false },
          { label: blog.title, active: true },
        ],
      };
      this.applySeo(blog);
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['sidebar']) {
        this.sidebar = params['sidebar'];
        return;
      }
      this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((theme) => {
        this.sidebar = theme?.blog?.blog_sidebar_type || 'left_sidebar';
      });
    });

    this.destroyRef.onDestroy(() => this.clearSeoElements());
  }

  filterOpen() {
    this.open = !this.open;
  }

  private applySeo(blog: IBlog): void {
    this.clearSeoElements();
    this.document.documentElement.lang = this.locale;

    const title = blog.meta_title || blog.title;
    const description = blog.meta_description || blog.description || '';
    const fallbackUrl = `${environment.cmsSiteURL.replace(/\/$/, '')}${
      this.locale === 'en-US' ? '/en/article/' : '/artikel/'
    }${encodeURIComponent(blog.slug)}`;
    const canonical = this.safePublicUrl(blog.canonical_url, fallbackUrl);
    const image = blog.blog_meta_image?.asset_url || blog.blog_thumbnail?.asset_url || '';

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    for (const [property, content] of Object.entries({
      'og:type': 'article',
      'og:url': canonical,
      'og:title': blog.og_title || title,
      'og:description': blog.og_description || description,
      'og:image': image,
      'og:locale': this.locale.replace('-', '_'),
    })) {
      this.meta.updateTag({ property, content });
    }

    for (const [name, content] of Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': blog.og_title || title,
      'twitter:description': blog.og_description || description,
      'twitter:image': image,
    })) {
      this.meta.updateTag({ name, content });
    }

    const canonicalLink = this.document.createElement('link');
    canonicalLink.setAttribute('data-article-seo', '');
    canonicalLink.rel = 'canonical';
    canonicalLink.href = canonical;
    this.document.head.appendChild(canonicalLink);

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
        author: { '@type': 'Organization', name: blog.created_by.name || 'MATEX' },
        mainEntityOfPage: canonical,
      } as Record<string, unknown>);
    const schemaScript = this.document.createElement('script');
    schemaScript.setAttribute('data-article-seo', '');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(schema);
    this.document.head.appendChild(schemaScript);
  }

  private safePublicUrl(value: string | undefined, fallback: string): string {
    try {
      const url = new URL(value || fallback);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
    } catch {
      return fallback;
    }
  }

  private clearSeoElements(): void {
    this.document.head
      .querySelectorAll('[data-article-seo]')
      .forEach((element) => element.remove());
  }
}
