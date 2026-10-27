import { Injectable } from '@angular/core';

import { map, Observable, of, switchMap } from 'rxjs';

import { WebsitePageService } from './website-page.service';
import { HOME_LAYOUT } from '../data/home-layout';
import { BannerLink, GadgetTheme } from '../interface/theme.interface';
import { IPublicWebsitePage } from '../interface/website-page.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly homeSectionDefaults = {
    home_contract_version: 3,
    latex_features: { status: true },
    categories: { status: true },
    products: { status: true },
    articles: { status: true },
    tags: { status: false },
    newsletter: { status: false },
    advertisement: { status: false },
  };

  constructor(private websitePageService: WebsitePageService) {}

  getHomePage(slug?: string, locale: 'id-ID' | 'en-US' = 'id-ID'): Observable<object> {
    const template$ = of(structuredClone(HOME_LAYOUT) as object);

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

    const advertisement = merged.advertisement;
    const advertisementMedia = page.media.find((media) => media.slot === 'home_advertisement');
    if (advertisement && advertisementMedia) {
      advertisement.image_url = advertisementMedia.asset_url;
      advertisement.image_alt = advertisementMedia.alt_text;
      if (!advertisement.cta_url && advertisementMedia.click_target) {
        advertisement.cta_url = advertisementMedia.click_target;
      }
    }

    return merged;
  }

  private normalizeHomeContent(value: unknown): Record<string, unknown> {
    if (!this.isRecord(value)) return { ...this.homeSectionDefaults };

    const contractVersion = Number(value['home_contract_version']);
    const isCurrentContract = contractVersion === 2 || contractVersion === 3;
    const keys = isCurrentContract
      ? [
          'latex_features',
          'categories',
          'products',
          'articles',
          'tags',
          'newsletter',
          'advertisement',
        ]
      : ['tags', 'newsletter'];
    const content: Record<string, unknown> = { home_contract_version: 3 };

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
