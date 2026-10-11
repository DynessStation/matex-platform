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
  IWebsitePageEditorAttachment,
  IWebsitePageEditorDetail,
  IWebsitePageEditorTranslation,
} from '../../../shared/interface/website-page-editor.interface';

//==================================================
//==== TYPE
//==================================================

type PreviewViewport = 'fit' | 'desktop' | 'tablet' | 'mobile';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-website-page-preview',

  imports: [TranslateModule],

  templateUrl: './website-page-preview.html',

  styleUrl: './website-page-preview.scss',
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

  //==================================================
  //==== DOCUMENT
  //==================================================

  private buildPreviewDocument(
    translation: IWebsitePageEditorTranslation,
  ): string {
    const title = this.escapeHtml(translation.website_page_title || '');

    const excerpt = this.escapeHtml(translation.website_page_excerpt || '');

    const content =
      translation.website_page_content?.trim() || '<p><em>—</em></p>';

    const hero = this.getHeroAttachment();

    const heroHtml = hero
      ? this.buildHero(hero, translation.website_page_locale)
      : '';

    const galleryHtml = this.buildGallery(translation.website_page_locale);

    const isGadgetHome = ['home', 'gadget-home-v1'].includes(
      this.page.website_page_template ?? '',
    );

    const isAbout = this.page.website_page_key === 'about';

    const gadgetHomeHtml = isGadgetHome
      ? this.buildGadgetHome(translation)
      : '';

    const aboutHtml = isAbout ? this.buildAbout(translation) : '';

    return `
      <!doctype html>

      <html lang="${this.escapeHtml(translation.website_page_locale)}">
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

            .gadget-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              background: #f4f5f7;
            }

            .gadget-main,
            .gadget-side,
            .gadget-tile {
              position: relative;
              overflow: hidden;
              background: linear-gradient(135deg, #f7f7f7, #eceff3);
            }

            .gadget-main { min-height: 460px; }
            .gadget-side { min-height: 230px; }

            .gadget-side-column {
              display: grid;
              grid-template-rows: repeat(2, minmax(0, 1fr));
            }

            .gadget-tiles {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .gadget-tile { aspect-ratio: 11 / 9; }

            .about-page {
              width: min(calc(100% - 48px), 1280px);
              margin: 0 auto;
              padding: clamp(40px, 6vw, 80px) 0 80px;
            }

            .about-heading {
              width: min(100%, 920px);
              margin: 0 auto 32px;
              text-align: center;
            }

            .about-heading h1 {
              font-size: clamp(30px, 5vw, 52px);
            }

            .about-image {
              width: 100%;
              height: auto;
              border-radius: 8px;
            }

            .about-highlights {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 28px;
              margin-top: 40px;
            }

            .about-highlight h2 {
              margin: 0 0 10px;
              font-size: 22px;
              line-height: 1.25;
            }

            .about-highlight p {
              margin: 0;
              color: #666666;
            }

            .gadget-main img,
            .gadget-side img,
            .gadget-tile img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .gadget-slot-label {
              position: absolute;
              inset: 50% auto auto 50%;
              transform: translate(-50%, -50%);
              color: #8a8f98;
              font-size: 13px;
              white-space: nowrap;
            }

            .home-preview-section {
              width: min(calc(100% - 48px), 1280px);
              margin: 0 auto;
              padding: clamp(40px, 6vw, 72px) 0;
              border-top: 1px dashed #d9dde3;
            }

            .latex-heading {
              max-width: 760px;
              margin: 0 auto 36px;
              text-align: center;
            }

            .latex-heading span,
            .ad-copy span {
              color: #d99a26;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: .14em;
            }

            .latex-heading h2 {
              margin: 8px 0 12px;
              color: #202c3c;
              font-size: clamp(28px, 4vw, 42px);
              line-height: 1.15;
            }

            .latex-heading p { margin: 0; color: #626b78; }

            .latex-layout {
              display: grid;
              grid-template-columns: 320px minmax(0, 1fr);
              gap: 28px;
            }

            .latex-tabs { display: flex; flex-direction: column; gap: 10px; }
            .latex-tab {
              display: flex;
              gap: 12px;
              padding: 15px 18px;
              border: 1px solid #e2e5e9;
              border-radius: 9px;
              background: #fff;
              color: #334155;
              font: inherit;
              font-weight: 700;
              text-align: left;
              cursor: pointer;
            }
            .latex-tab strong { color: #788392; }
            .latex-tab.active { background: #202c3c; color: #fff; border-color: #202c3c; }
            .latex-tab.active strong { color: #d99a26; }

            .latex-panel-wrap {
              display: flex;
              align-items: center;
              min-height: 360px;
              padding: clamp(28px, 5vw, 52px);
              border-radius: 20px;
              background-color: rgba(32, 44, 60, .94);
              background-image: radial-gradient(rgba(255, 255, 255, .05) 15%, transparent 16%);
              background-size: 16px 16px;
              color: #fff;
            }
            .latex-panel { display: none; }
            .latex-panel.active { display: block; }
            .latex-panel h3 { margin: 0 0 18px; color: #fff; font-size: 28px; }
            .latex-panel h3 strong { color: #d99a26; margin-right: 12px; }
            .latex-panel p { margin: 0; color: #d0d7de; }

            .home-placeholder-heading { margin: 0 0 20px; color: #202c3c; font-size: 28px; }
            .home-placeholder-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
            .home-placeholder-card { min-height: 140px; border-radius: 10px; background: #f2f4f7; }

            .home-ad {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 28px;
              min-height: 240px;
              padding: clamp(30px, 5vw, 62px);
              border-radius: 18px;
              background: #202c3c center / cover no-repeat;
              color: #fff;
            }
            .ad-copy { max-width: 720px; }
            .ad-copy h2 { margin: 9px 0 12px; color: #fff; font-size: clamp(28px, 4vw, 46px); line-height: 1.12; }
            .ad-copy p { margin: 0; color: rgba(255,255,255,.76); }
            .ad-button { flex: 0 0 auto; padding: 14px 20px; border-radius: 8px; background: #f5a400; color: #172231; font-weight: 800; }

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

              .gadget-grid { grid-template-columns: 1fr; }
              .gadget-side-column { display: none; }
              .gadget-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gadget-main { min-height: 360px; }
              .about-page { width: min(calc(100% - 32px), 1280px); }
              .about-highlights { grid-template-columns: 1fr; gap: 24px; }
              .home-preview-section { width: min(calc(100% - 32px), 1280px); }
              .latex-layout { grid-template-columns: 1fr; }
              .latex-tabs { flex-direction: row; overflow: auto; }
              .latex-tab { flex: 0 0 auto; }
              .home-placeholder-grid { grid-template-columns: 1fr; }
              .home-ad { align-items: flex-start; flex-direction: column; }
            }
          </style>
        </head>

        <body>
          <main class="page">
            ${isAbout ? aboutHtml : isGadgetHome ? gadgetHomeHtml : heroHtml}

            ${
              isAbout || isGadgetHome
                ? ''
                : `<header class="header">
              <div class="header-inner">
                <h1>${title}</h1>

                ${excerpt ? `<p class="excerpt">${excerpt}</p>` : ''}
              </div>
            </header>`
            }

            ${
              isAbout || isGadgetHome
                ? ''
                : `<article class="content">
              ${content}
            </article>`
            }

            ${isAbout || isGadgetHome ? '' : galleryHtml}
          </main>
          ${
            isGadgetHome
              ? `<script>
                  document.querySelectorAll('.latex-tab').forEach((button) => {
                    button.addEventListener('click', () => {
                      const index = button.getAttribute('data-index');
                      document.querySelectorAll('.latex-tab').forEach((item) => item.classList.remove('active'));
                      document.querySelectorAll('.latex-panel').forEach((item) => item.classList.remove('active'));
                      button.classList.add('active');
                      document.querySelector('.latex-panel[data-index="' + index + '"]')?.classList.add('active');
                    });
                  });
                </script>`
              : ''
          }
        </body>
      </html>
    `;
  }

  private buildAbout(translation: IWebsitePageEditorTranslation): string {
    const image = this.page.attachments.find(
      (attachment) =>
        attachment.website_page_attachment_role === 'about_content' &&
        attachment.website_page_attachment_is_public === 1,
    );
    const imageTranslation = image?.translations.find(
      (item) =>
        item.website_page_attachment_locale === translation.website_page_locale,
    );
    const imageHtml = image
      ? `<img class="about-image" src="${this.escapeHtml(image.asset_url)}" alt="${this.escapeHtml(imageTranslation?.website_page_attachment_alt_text || image.name || '')}">`
      : '';

    const content = this.isRecord(translation.website_page_content_json)
      ? translation.website_page_content_json
      : {};
    const items =
      content['about_contract_version'] === 1 &&
      Array.isArray(content['highlights'])
        ? content['highlights']
        : Array.isArray(content['features'])
          ? content['features']
          : [];
    const highlights = items
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => ({
        title: typeof item['title'] === 'string' ? item['title'].trim() : '',
        description:
          typeof item['description'] === 'string'
            ? item['description'].trim()
            : '',
      }))
      .filter((item) => item.title && item.description)
      .slice(0, 3)
      .map(
        (item) => `
          <article class="about-highlight">
            <h2>${this.escapeHtml(item.title)}</h2>
            <p>${this.escapeHtml(item.description)}</p>
          </article>
        `,
      )
      .join('');

    return `
      <section class="about-page">
        <header class="about-heading">
          <h1>${this.escapeHtml(translation.website_page_title || '')}</h1>
          ${
            translation.website_page_excerpt
              ? `<p class="excerpt">${this.escapeHtml(translation.website_page_excerpt)}</p>`
              : ''
          }
        </header>
        ${imageHtml}
        ${highlights ? `<div class="about-highlights">${highlights}</div>` : ''}
      </section>
    `;
  }

  private buildGadgetHome(translation: IWebsitePageEditorTranslation): string {
    const locale = translation.website_page_locale;
    const slot = (role: string, className: string, label: string): string => {
      const attachment = this.page.attachments.find(
        (item) =>
          item.website_page_attachment_role === role &&
          item.website_page_attachment_is_public === 1,
      );

      if (!attachment) {
        return `<div class="${className}"><span class="gadget-slot-label">${label}</span></div>`;
      }

      const translation = attachment.translations.find(
        (item) => item.website_page_attachment_locale === locale,
      );

      const alt = this.escapeHtml(
        translation?.website_page_attachment_alt_text || attachment.name || '',
      );

      return `<div class="${className}"><img src="${this.escapeHtml(attachment.asset_url)}" alt="${alt}"></div>`;
    };

    const content = this.isRecord(translation.website_page_content_json)
      ? translation.website_page_content_json
      : {};
    const section = (key: string): Record<string, unknown> =>
      this.isRecord(content[key]) ? content[key] : {};
    const visible = (key: string, fallback = true): boolean => {
      const value = section(key)['status'];
      return typeof value === 'boolean' ? value : fallback;
    };
    const text = (
      source: Record<string, unknown>,
      key: string,
      fallback = '',
    ): string =>
      typeof source[key] === 'string'
        ? String(source[key]).trim() || fallback
        : fallback;
    const latex = section('latex_features');
    const latexItems = Array.isArray(latex['items'])
      ? latex['items']
          .filter((item): item is Record<string, unknown> =>
            this.isRecord(item),
          )
          .map((item) => ({
            title: text(item, 'title'),
            description: text(item, 'description'),
          }))
          .filter((item) => item.title && item.description)
          .slice(0, 8)
      : [];
    const latexTabs = latexItems
      .map(
        (item, index) => `
          <button class="latex-tab${index === 0 ? ' active' : ''}" type="button" data-index="${index}">
            <strong>${String(index + 1).padStart(2, '0')}</strong>
            <span>${this.escapeHtml(item.title)}</span>
          </button>`,
      )
      .join('');
    const latexPanels = latexItems
      .map(
        (item, index) => `
          <article class="latex-panel${index === 0 ? ' active' : ''}" data-index="${index}">
            <h3><strong>${String(index + 1).padStart(2, '0')}</strong>${this.escapeHtml(item.title)}</h3>
            <p>${this.escapeHtml(item.description)}</p>
          </article>`,
      )
      .join('');
    const latexHtml =
      visible('latex_features') && latexItems.length
        ? `<section class="home-preview-section">
            <header class="latex-heading">
              <span>${this.escapeHtml(text(latex, 'eyebrow'))}</span>
              <h2>${this.escapeHtml(text(latex, 'title'))}</h2>
              <p>${this.escapeHtml(text(latex, 'description'))}</p>
            </header>
            <div class="latex-layout">
              <div class="latex-tabs">${latexTabs}</div>
              <div class="latex-panel-wrap">${latexPanels}</div>
            </div>
          </section>`
        : '';

    const placeholder = (key: string, title: string, count: number): string =>
      visible(key)
        ? `<section class="home-preview-section">
            <h2 class="home-placeholder-heading">${this.escapeHtml(title)}</h2>
            <div class="home-placeholder-grid">${Array.from({ length: count }, () => '<div class="home-placeholder-card"></div>').join('')}</div>
          </section>`
        : '';

    const advertisement = section('advertisement');
    const advertisementImage = this.page.attachments.find(
      (item) =>
        item.website_page_attachment_role === 'home_advertisement' &&
        item.website_page_attachment_is_public === 1,
    );
    const advertisementStyle = advertisementImage
      ? ` style="background-image:linear-gradient(90deg, rgba(15,25,38,.96), rgba(15,25,38,.62)),url('${this.escapeHtml(advertisementImage.asset_url)}')"`
      : '';
    const advertisementHtml = visible('advertisement', false)
      ? `<section class="home-preview-section">
          <div class="home-ad"${advertisementStyle}>
            <div class="ad-copy">
              <span>${this.escapeHtml(text(advertisement, 'label'))}</span>
              <h2>${this.escapeHtml(text(advertisement, 'title'))}</h2>
              <p>${this.escapeHtml(text(advertisement, 'description'))}</p>
            </div>
            ${text(advertisement, 'cta_label') ? `<span class="ad-button">${this.escapeHtml(text(advertisement, 'cta_label'))} →</span>` : ''}
          </div>
        </section>`
      : '';

    return `
      <section>
        <div class="gadget-grid">
          ${slot('home_main', 'gadget-main', 'Banner utama 8:5')}
          <div class="gadget-side-column">
            ${slot('home_side_1', 'gadget-side', 'Banner samping atas')}
            ${slot('home_side_2', 'gadget-side', 'Banner samping bawah')}
          </div>
        </div>
        <div class="gadget-tiles">
          ${slot('home_tile_1', 'gadget-tile', 'Tile 1')}
          ${slot('home_tile_2', 'gadget-tile', 'Tile 2')}
          ${slot('home_tile_3', 'gadget-tile', 'Tile 3')}
          ${slot('home_tile_4', 'gadget-tile', 'Tile 4')}
        </div>
      </section>
      ${latexHtml}
      ${placeholder('categories', locale === 'en-US' ? 'Product Categories' : 'Kategori Produk', 3)}
      ${placeholder('products', locale === 'en-US' ? 'Featured Products' : 'Produk Unggulan', 3)}
      ${placeholder('articles', locale === 'en-US' ? 'Latest Articles' : 'Artikel Terbaru', 3)}
      ${visible('newsletter', false) ? placeholder('newsletter', locale === 'en-US' ? 'Stay informed' : 'Ikuti informasi terbaru', 1) : ''}
      ${advertisementHtml}
    `;
  }

  //==================================================
  //==== HERO
  //==================================================

  private getHeroAttachment(): IWebsitePageEditorAttachment | null {
    return (
      this.page.attachments.find(
        (attachment) =>
          attachment.website_page_attachment_role === 'hero' &&
          attachment.website_page_attachment_is_public === 1,
      ) ?? null
    );
  }

  private buildHero(
    attachment: IWebsitePageEditorAttachment,
    locale: string,
  ): string {
    const translation = attachment.translations.find(
      (item) => item.website_page_attachment_locale === locale,
    );

    const alt = this.escapeHtml(
      translation?.website_page_attachment_alt_text || attachment.name || '',
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
        attachment.website_page_attachment_role === 'gallery' &&
        attachment.website_page_attachment_is_public === 1,
    );

    if (!attachments.length) {
      return '';
    }

    const items = attachments
      .map((attachment) => {
        const translation = attachment.translations.find(
          (item) => item.website_page_attachment_locale === locale,
        );

        const alt = this.escapeHtml(
          translation?.website_page_attachment_alt_text ||
            attachment.name ||
            '',
        );

        const caption = this.escapeHtml(
          translation?.website_page_attachment_caption || '',
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private revokeObjectUrl(): void {
    if (!this.objectUrl) {
      return;
    }

    URL.revokeObjectURL(this.objectUrl);

    this.objectUrl = null;
  }
}
