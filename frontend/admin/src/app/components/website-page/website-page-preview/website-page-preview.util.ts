import { PREVIEW_DOCUMENT_STYLES } from './website-page-preview.styles';
import {
  IWebsitePageEditorAttachment,
  IWebsitePageEditorDetail,
  IWebsitePageEditorTranslation,
} from '../../../shared/interface/website-page-editor.interface';

// Builds the standalone HTML document the website page preview shows in its sandboxed
// iframe. Pure functions of the page being edited; every value from the page is escaped.

//==================================================
//==== DOCUMENT
//==================================================

/** The full HTML document shown in the preview iframe for one translation. */
export function buildPreviewDocument(
  page: IWebsitePageEditorDetail,
  translation: IWebsitePageEditorTranslation,
): string {
  const title = escapeHtml(translation.website_page_title || '');

  const excerpt = escapeHtml(translation.website_page_excerpt || '');

  const content =
    translation.website_page_content?.trim() || '<p><em>—</em></p>';

  const hero = getHeroAttachment(page);

  const heroHtml = hero ? buildHero(hero, translation.website_page_locale) : '';

  const galleryHtml = buildGallery(page, translation.website_page_locale);

  const isGadgetHome = ['home', 'gadget-home-v1'].includes(
    page.website_page_template ?? '',
  );

  const isAbout = page.website_page_key === 'about';

  const gadgetHomeHtml = isGadgetHome ? buildGadgetHome(page, translation) : '';

  const aboutHtml = isAbout ? buildAbout(page, translation) : '';

  return `
    <!doctype html>

    <html lang="${escapeHtml(translation.website_page_locale)}">
      <head>
        <meta charset="utf-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <title>${title}</title>

        <style>${PREVIEW_DOCUMENT_STYLES}</style>
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

function buildAbout(
  page: IWebsitePageEditorDetail,
  translation: IWebsitePageEditorTranslation,
): string {
  const image = page.attachments.find(
    (attachment) =>
      attachment.website_page_attachment_role === 'about_content' &&
      attachment.website_page_attachment_is_public === 1,
  );
  const imageTranslation = image?.translations.find(
    (item) =>
      item.website_page_attachment_locale === translation.website_page_locale,
  );
  const imageHtml = image
    ? `<img class="about-image" src="${escapeHtml(image.asset_url)}" alt="${escapeHtml(imageTranslation?.website_page_attachment_alt_text || image.name || '')}">`
    : '';

  const content = isRecord(translation.website_page_content_json)
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
    .filter((item): item is Record<string, unknown> => isRecord(item))
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
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `,
    )
    .join('');

  return `
    <section class="about-page">
      <header class="about-heading">
        <h1>${escapeHtml(translation.website_page_title || '')}</h1>
        ${
          translation.website_page_excerpt
            ? `<p class="excerpt">${escapeHtml(translation.website_page_excerpt)}</p>`
            : ''
        }
      </header>
      ${imageHtml}
      ${highlights ? `<div class="about-highlights">${highlights}</div>` : ''}
    </section>
  `;
}

function buildGadgetHome(
  page: IWebsitePageEditorDetail,
  translation: IWebsitePageEditorTranslation,
): string {
  const locale = translation.website_page_locale;
  const slot = (role: string, className: string, label: string): string => {
    const attachment = page.attachments.find(
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

    const alt = escapeHtml(
      translation?.website_page_attachment_alt_text || attachment.name || '',
    );

    return `<div class="${className}"><img src="${escapeHtml(attachment.asset_url)}" alt="${alt}"></div>`;
  };

  const content = isRecord(translation.website_page_content_json)
    ? translation.website_page_content_json
    : {};
  const section = (key: string): Record<string, unknown> =>
    isRecord(content[key]) ? content[key] : {};
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
        .filter((item): item is Record<string, unknown> => isRecord(item))
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
          <span>${escapeHtml(item.title)}</span>
        </button>`,
    )
    .join('');
  const latexPanels = latexItems
    .map(
      (item, index) => `
        <article class="latex-panel${index === 0 ? ' active' : ''}" data-index="${index}">
          <h3><strong>${String(index + 1).padStart(2, '0')}</strong>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>`,
    )
    .join('');
  const latexHtml =
    visible('latex_features') && latexItems.length
      ? `<section class="home-preview-section">
          <header class="latex-heading">
            <span>${escapeHtml(text(latex, 'eyebrow'))}</span>
            <h2>${escapeHtml(text(latex, 'title'))}</h2>
            <p>${escapeHtml(text(latex, 'description'))}</p>
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
          <h2 class="home-placeholder-heading">${escapeHtml(title)}</h2>
          <div class="home-placeholder-grid">${Array.from({ length: count }, () => '<div class="home-placeholder-card"></div>').join('')}</div>
        </section>`
      : '';

  const advertisement = section('advertisement');
  const advertisementImage = page.attachments.find(
    (item) =>
      item.website_page_attachment_role === 'home_advertisement' &&
      item.website_page_attachment_is_public === 1,
  );
  const advertisementStyle = advertisementImage
    ? ` style="background-image:linear-gradient(90deg, rgba(15,25,38,.96), rgba(15,25,38,.62)),url('${escapeHtml(advertisementImage.asset_url)}')"`
    : '';
  const advertisementHtml = visible('advertisement', false)
    ? `<section class="home-preview-section">
        <div class="home-ad"${advertisementStyle}>
          <div class="ad-copy">
            <span>${escapeHtml(text(advertisement, 'label'))}</span>
            <h2>${escapeHtml(text(advertisement, 'title'))}</h2>
            <p>${escapeHtml(text(advertisement, 'description'))}</p>
          </div>
          ${text(advertisement, 'cta_label') ? `<span class="ad-button">${escapeHtml(text(advertisement, 'cta_label'))} →</span>` : ''}
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

function getHeroAttachment(
  page: IWebsitePageEditorDetail,
): IWebsitePageEditorAttachment | null {
  return (
    page.attachments.find(
      (attachment) =>
        attachment.website_page_attachment_role === 'hero' &&
        attachment.website_page_attachment_is_public === 1,
    ) ?? null
  );
}

function buildHero(
  attachment: IWebsitePageEditorAttachment,
  locale: string,
): string {
  const translation = attachment.translations.find(
    (item) => item.website_page_attachment_locale === locale,
  );

  const alt = escapeHtml(
    translation?.website_page_attachment_alt_text || attachment.name || '',
  );

  return `
    <img
      class="hero-image"
      src="${escapeHtml(attachment.asset_url)}"
      alt="${alt}"
    >
  `;
}

function buildGallery(page: IWebsitePageEditorDetail, locale: string): string {
  const attachments = page.attachments.filter(
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

      const alt = escapeHtml(
        translation?.website_page_attachment_alt_text || attachment.name || '',
      );

      const caption = escapeHtml(
        translation?.website_page_attachment_caption || '',
      );

      return `
        <figure class="gallery-item">
          <img
            src="${escapeHtml(attachment.asset_url)}"
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
