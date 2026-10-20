import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { TranslateModule } from '@ngx-translate/core';

import {
  PREVIEW_VIEWPORT_WIDTH,
  PreviewViewport,
} from './website-page-preview.model';
import { buildPreviewDocument } from './website-page-preview.util';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorTranslation,
} from '../../../shared/interface/website-page-editor.interface';

// Live preview of a website page: a sandboxed iframe showing the document built by
// website-page-preview.util.ts, with a language switch and device widths.
@Component({
  selector: 'app-website-page-preview',

  imports: [TranslateModule],

  templateUrl: './website-page-preview.html',
})
export class WebsitePagePreview implements OnChanges, OnDestroy {
  //==================================================
  //==== INJECT
  //==================================================

  private sanitizer = inject(DomSanitizer);

  private platformId = inject(PLATFORM_ID);

  //==================================================
  //==== INPUT
  //==================================================

  @Input({ required: true })
  page!: IWebsitePageEditorDetail;

  //==================================================
  //==== STATE
  //==================================================

  public selectedLocale = '';

  public viewport: PreviewViewport = 'fit';

  public previewUrl: SafeResourceUrl | null = null;

  private objectUrl: string | null = null;

  //==================================================
  //==== LIFECYCLE
  //==================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['page'] || !this.page) {
      return;
    }

    const locales = this.page.translations.map(
      (translation) => translation.website_page_locale,
    );

    if (!locales.includes(this.selectedLocale)) {
      this.selectedLocale = locales.includes(
        this.page.website_page_default_locale,
      )
        ? this.page.website_page_default_locale
        : (locales[0] ?? '');
    }

    this.refreshPreview();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  //==================================================
  //==== VIEWPORT
  //==================================================

  setViewport(viewport: PreviewViewport): void {
    this.viewport = viewport;
  }

  get viewportWidth(): string {
    return PREVIEW_VIEWPORT_WIDTH[this.viewport];
  }

  //==================================================
  //==== LOCALE
  //==================================================

  selectLocale(locale: string): void {
    if (!locale || locale === this.selectedLocale) {
      return;
    }

    this.selectedLocale = locale;

    this.refreshPreview();
  }

  //==================================================
  //==== PREVIEW
  //==================================================

  private refreshPreview(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const translation = this.getSelectedTranslation();

    if (!translation) {
      this.previewUrl = null;
      return;
    }

    this.revokeObjectUrl();

    const blob = new Blob([buildPreviewDocument(this.page, translation)], {
      type: 'text/html;charset=utf-8',
    });

    this.objectUrl = URL.createObjectURL(blob);

    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.objectUrl,
    );
  }

  private getSelectedTranslation(): IWebsitePageEditorTranslation | null {
    return (
      this.page.translations.find(
        (translation) =>
          translation.website_page_locale === this.selectedLocale,
      ) ??
      this.page.translations[0] ??
      null
    );
  }

  private revokeObjectUrl(): void {
    if (!this.objectUrl) {
      return;
    }

    URL.revokeObjectURL(this.objectUrl);

    this.objectUrl = null;
  }
}
