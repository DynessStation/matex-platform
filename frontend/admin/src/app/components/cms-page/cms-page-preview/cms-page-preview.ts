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
  ICmsPageAttachment,
  ICmsPageDetail,
  ICmsPageTranslation,
} from '../../../shared/interface/cms-page.interface';

//==================================================
//==== TYPE
//==================================================

type PreviewViewport = 'fit' | 'desktop' | 'tablet' | 'mobile';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-cms-page-preview',

  imports: [TranslateModule],

  templateUrl: './cms-page-preview.html',

  styleUrl: './cms-page-preview.scss',
})
export class CmsPagePreview implements OnChanges, OnDestroy {
  //==================================================
  //==== INJECT
  //==================================================

  private sanitizer = inject(DomSanitizer);

  private platformId = inject(PLATFORM_ID);

  //==================================================
  //==== INPUT
  //==================================================

  @Input({ required: true })
  page!: ICmsPageDetail;

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
      (translation) => translation.cms_page_locale,
    );

    if (!locales.includes(this.selectedLocale)) {
      this.selectedLocale = locales.includes(this.page.cms_page_default_locale)
        ? this.page.cms_page_default_locale
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
    switch (this.viewport) {
      case 'desktop':
        return '1200px';

      case 'tablet':
        return '768px';

      case 'mobile':
        return '390px';

      default:
        return '100%';
    }
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

    const documentHtml = this.buildPreviewDocument(translation);

    const blob = new Blob([documentHtml], {
      type: 'text/html;charset=utf-8',
    });

    this.objectUrl = URL.createObjectURL(blob);

    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.objectUrl,
    );
  }

  private getSelectedTranslation(): ICmsPageTranslation | null {
    return (
      this.page.translations.find(
        (translation) => translation.cms_page_locale === this.selectedLocale,
      ) ??
      this.page.translations[0] ??
      null
    );
  }

  //==================================================
  //==== DOCUMENT
  //==================================================

  private buildPreviewDocument(translation: ICmsPageTranslation): string {
    const title = this.escapeHtml(translation.cms_page_title || '');

    const excerpt = this.escapeHtml(translation.cms_page_excerpt || '');

    const content = translation.cms_page_content?.trim() || '<p><em>—</em></p>';

    const hero = this.getHeroAttachment();

    const heroHtml = hero
      ? this.buildHero(hero, translation.cms_page_locale)
      : '';

    const galleryHtml = this.buildGallery(translation.cms_page_locale);

    return `
      <!doctype html>

      <html lang="${this.escapeHtml(translation.cms_page_locale)}">
        <head>
          <meta charset="utf-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >

          <title>${title}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
            }

            body {
              min-height: 100vh;
              background: #ffffff;
              color: #252525;
              font-family:
                Inter,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
              line-height: 1.7;
            }

            img {
              display: block;
              max-width: 100%;
            }

            a {
              color: inherit;
              pointer-events: none;
            }

            .page {
              min-height: 100vh;
              background: #ffffff;
            }

            .hero-image {
              width: 100%;
              max-height: 520px;
              object-fit: cover;
            }

            .header {
              padding: clamp(40px, 7vw, 88px) 24px 32px;
              text-align: center;
            }

            .header-inner {
              width: min(100%, 920px);
              margin: 0 auto;
            }

            h1 {
              margin: 0;
              font-size: clamp(32px, 6vw, 64px);
              line-height: 1.1;
              letter-spacing: -0.03em;
            }

            .excerpt {
              max-width: 720px;
              margin: 24px auto 0;
              color: #666666;
              font-size: clamp(16px, 2vw, 20px);
            }

            .content {
              width: min(calc(100% - 48px), 920px);
              margin: 0 auto;
              padding: 32px 0 80px;
            }

            .content h2,
            .content h3,
            .content h4 {
              line-height: 1.25;
              margin-top: 1.8em;
            }

            .content p {
              margin: 0 0 1.2em;
            }

            .content img {
              height: auto;
              margin: 32px auto;
              border-radius: 8px;
            }

            .content blockquote {
              margin: 32px 0;
              padding: 16px 24px;
              border-left: 4px solid #dddddd;
              background: #f8f8f8;
            }

            .content table {
              display: block;
              width: 100%;
              overflow-x: auto;
              border-collapse: collapse;
            }

            .content th,
            .content td {
              padding: 10px 12px;
              border: 1px solid #dddddd;
            }

            .gallery {
              width: min(calc(100% - 48px), 1080px);
              margin: 0 auto;
              padding: 0 0 80px;
            }

            .gallery-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 20px;
            }

           .gallery-item {
              margin: 0;
              overflow: hidden;
              border: 1px solid #eeeeee;
              border-radius: 12px;
              background: #ffffff;
            }

            .gallery-item img {
              width: 100%;
              aspect-ratio: 16 / 10;
              object-fit: cover;
            }

            .gallery-caption {
              padding: 14px 16px;
              color: #666666;
              font-size: 14px;
            }

            @media (max-width: 640px) {
              .header {
                padding-top: 36px;
              }

              .content,
              .gallery {
                width: min(calc(100% - 32px), 920px);
              }

              .gallery-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>

        <body>
          <main class="page">
            ${heroHtml}

            <header class="header">
              <div class="header-inner">
                <h1>${title}</h1>

                ${excerpt ? `<p class="excerpt">${excerpt}</p>` : ''}
              </div>
            </header>

            <article class="content">
              ${content}
            </article>

            ${galleryHtml}
          </main>
        </body>
      </html>
    `;
  }

  //==================================================
  //==== HERO
  //==================================================

  private getHeroAttachment(): ICmsPageAttachment | null {
    return (
      this.page.attachments.find(
        (attachment) =>
          attachment.cms_page_attachment_role === 'hero' &&
          attachment.cms_page_attachment_is_public === 1,
      ) ?? null
    );
  }

  private buildHero(attachment: ICmsPageAttachment, locale: string): string {
    const translation = attachment.translations.find(
      (item) => item.cms_page_attachment_locale === locale,
    );

    const alt = this.escapeHtml(
      translation?.cms_page_attachment_alt_text || attachment.name || '',
    );

    return `
      <img
        class="hero-image"
        src="${this.escapeHtml(attachment.asset_url)}"
        alt="${alt}"
      >
    `;
  }

  //==================================================
  //==== GALLERY
  //==================================================

  private buildGallery(locale: string): string {
    const attachments = this.page.attachments.filter(
      (attachment) =>
        attachment.cms_page_attachment_role === 'gallery' &&
        attachment.cms_page_attachment_is_public === 1,
    );

    if (!attachments.length) {
      return '';
    }

    const items = attachments
      .map((attachment) => {
        const translation = attachment.translations.find(
          (item) => item.cms_page_attachment_locale === locale,
        );

        const alt = this.escapeHtml(
          translation?.cms_page_attachment_alt_text || attachment.name || '',
        );

        const caption = this.escapeHtml(
          translation?.cms_page_attachment_caption || '',
        );

        return `
          <figure class="gallery-item">
            <img
              src="${this.escapeHtml(attachment.asset_url)}"
              alt="${alt}"
            >

            ${
              caption
                ? `<figcaption class="gallery-caption">${caption}</figcaption>`
                : ''
            }
          </figure>
        `;
      })
      .join('');

    return `
      <section class="gallery">
        <div class="gallery-grid">
          ${items}
        </div>
      </section>
    `;
  }

  //==================================================
  //==== SECURITY
  //==================================================

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private revokeObjectUrl(): void {
    if (!this.objectUrl) {
      return;
    }

    URL.revokeObjectURL(this.objectUrl);

    this.objectUrl = null;
  }
}
