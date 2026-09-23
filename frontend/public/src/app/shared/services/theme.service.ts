import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { CmsPageService } from './cms-page.service';
import { environment } from '../../../environments/environment';
import { IPublicCmsPage } from '../interface/cms-page.interface';
import { BannerLink, GadgetTheme, ThemesModel } from '../interface/theme.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly cmsHomeSectionDefaults = {
    sale_product: { status: false },
    top_product_by_categories: { status: false },
    two_column_banner: { status: false },
    categories: { status: false },
    banner_with_tabs_product: { status: false },
    offers_product: { status: false },
    trending_deals_section: { status: false },
    offer_banner: { status: false },
    tags: { status: false },
    newsletter: { status: false },
  };

  constructor(
    private http: HttpClient,
    private cmsPageService: CmsPageService,
  ) {}

  getThemes(): Observable<ThemesModel> {
    return this.http.get<ThemesModel>(`${environment.URL}/theme.json`);
  }

  getHomePage(slug?: string): Observable<any> {
    const template$ = this.http.get(`${environment.URL}/home/${slug}.json`);

    if (slug !== 'gadget-store') return template$;

    return template$.pipe(
      switchMap((template) =>
        this.cmsPageService.getPage('id-ID', 'home').pipe(
          map((page) => this.mergeGadgetHome(template as GadgetTheme, page)),
          catchError(() => of(template)),
        ),
      ),
    );
  }

  private mergeGadgetHome(template: GadgetTheme, page: IPublicCmsPage): GadgetTheme {
    const content = this.isRecord(page.content_json) ? page.content_json : {};
    const safeTemplate = this.mergeObjects(template, this.cmsHomeSectionDefaults);
    const merged = this.mergeObjects(safeTemplate, content) as unknown as GadgetTheme;

    merged.slug = 'gadget-store';

    const banners: Record<string, BannerLink | undefined> = {
      home_main: merged.home_selection?.main_banner,
      home_side_1: merged.home_selection?.sub_banner_1,
      home_side_2: merged.home_selection?.sub_banner_2,
      home_tile_1: merged.home_selection?.four_column_banner?.banner_1,
      home_tile_2: merged.home_selection?.four_column_banner?.banner_2,
      home_tile_3: merged.home_selection?.four_column_banner?.banner_3,
      home_tile_4: merged.home_selection?.four_column_banner?.banner_4,
    };

    for (const attachment of page.attachments) {
      const banner = banners[attachment.role];
      if (banner && attachment.asset_url) banner.image_url = attachment.asset_url;
    }

    return merged;
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
