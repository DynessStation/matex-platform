import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { map, Observable, switchMap } from 'rxjs';

import { WebsitePageService } from './website-page.service';
import { environment } from '../../../environments/environment';
import { IPublicWebsitePage } from '../interface/website-page.interface';
import { BannerLink, GadgetTheme, ThemesModel } from '../interface/theme.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly homeSectionDefaults = {
    home_contract_version: 2,
    latex_features: { status: true },
    categories: { status: true },
    products: { status: true },
    articles: { status: true },
    tags: { status: false },
    newsletter: { status: false },
  };

  constructor(
    private http: HttpClient,
    private websitePageService: WebsitePageService,
  ) {}

  getThemes(): Observable<ThemesModel> {
    return this.http.get<ThemesModel>(`${environment.URL}/theme.json`);
  }

  getHomePage(slug?: string, locale: 'id-ID' | 'en-US' = 'id-ID'): Observable<any> {
    const template$ = this.http.get(`${environment.URL}/home/${slug}.json`);

    if (slug !== 'gadget-store') return template$;

    return template$.pipe(
      switchMap((template) =>
        this.websitePageService
          .getPage(locale, 'home')
          .pipe(map((page) => this.mergeGadgetHome(template as GadgetTheme, page))),
      ),
    );
  }

  private mergeGadgetHome(template: GadgetTheme, page: IPublicWebsitePage): GadgetTheme {
    const content = this.normalizeHomeContent(page.content);
    const safeTemplate = this.mergeObjects(template, this.homeSectionDefaults);
    const merged = this.mergeObjects(safeTemplate, content) as unknown as GadgetTheme;

    merged.slug = 'gadget-store';
    merged.website_page = page;

    const banners: Record<string, BannerLink | undefined> = {
      home_main: merged.home_selection?.main_banner,
      home_side_1: merged.home_selection?.sub_banner_1,
      home_side_2: merged.home_selection?.sub_banner_2,
      home_tile_1: merged.home_selection?.four_column_banner?.banner_1,
      home_tile_2: merged.home_selection?.four_column_banner?.banner_2,
      home_tile_3: merged.home_selection?.four_column_banner?.banner_3,
      home_tile_4: merged.home_selection?.four_column_banner?.banner_4,
    };

    for (const media of page.media) {
      const banner = banners[media.slot];
      if (!banner) continue;

      if (media.asset_url) banner.image_url = media.asset_url;

      banner.redirection_type = media.click_action;
      banner.link = media.click_target ?? '';
      banner.alt_text = media.alt_text;
    }

    return merged;
  }

  private normalizeHomeContent(value: unknown): Record<string, unknown> {
    if (!this.isRecord(value)) return { ...this.homeSectionDefaults };

    const isCurrentContract = value['home_contract_version'] === 2;
    const keys = isCurrentContract
      ? ['latex_features', 'categories', 'products', 'articles', 'tags', 'newsletter']
      : ['tags', 'newsletter'];
    const content: Record<string, unknown> = { home_contract_version: 2 };

    for (const key of keys) {
      if (this.isRecord(value[key])) content[key] = value[key];
    }

    return this.mergeObjects(this.homeSectionDefaults, content) as Record<string, unknown>;
  }

  private mergeObjects(base: unknown, override: unknown): unknown {
    if (!this.isRecord(base) || !this.isRecord(override)) return override;

    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      result[key] =
        this.isRecord(value) && this.isRecord(result[key])
          ? this.mergeObjects(result[key], value)
          : value;
    }
    return result;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
