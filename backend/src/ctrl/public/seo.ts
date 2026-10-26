import { Router } from 'express';
import { RowDataPacket } from 'mysql2';

import { pool } from '../../db';

const router = Router();

type SitemapEntry = {
  location: string;
  lastModified?: unknown;
};

const publicSiteUrl = (): string => {
  const configured = String(process.env.PUBLIC_SITE_URL ?? 'https://matexindo.com').trim();

  try {
    const url = new URL(configured);
    if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported protocol');
    return url.origin;
  } catch {
    return 'https://matexindo.com';
  }
};

const companyId = (): number | null => {
  const value = Number(process.env.PUBLIC_COMPANY_ID);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

const localizedPath = (locale: unknown, idPath: string, englishPath: string): string =>
  String(locale) === 'en-US' ? englishPath : idPath;

const pagePath = (row: RowDataPacket): string => {
  const locale = String(row.locale);
  const path = encodeURIComponent(String(row.slug_or_path ?? ''));

  switch (String(row.content_type)) {
    case 'home':
      return localizedPath(locale, '/', '/en');
    case 'contact':
      return localizedPath(locale, '/kontak', '/en/contact-us');
    case 'faq':
      return localizedPath(locale, '/faq', '/en/faq');
    case 'product':
      return localizedPath(locale, `/produk/${path}`, `/en/product/${path}`);
    case 'category':
      return localizedPath(locale, `/kategori/${path}`, `/en/category/${path}`);
    case 'article':
      return localizedPath(locale, `/artikel/${path}`, `/en/article/${path}`);
    default:
      return localizedPath(locale, `/${path}`, `/en/${path}`);
  }
};

const xmlEscape = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const lastModified = (value: unknown): string | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

export const buildSitemapXml = (siteUrl: string, entries: SitemapEntry[]): string => {
  const unique = new Map<string, unknown>();
  for (const entry of entries) {
    if (!entry.location.startsWith('/')) continue;
    const previous = unique.get(entry.location);
    if (!previous || lastModified(entry.lastModified)) {
      unique.set(entry.location, entry.lastModified);
    }
  }

  const urls = [...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([location, modified]) => {
      const date = lastModified(modified);
      return [
        '  <url>',
        `    <loc>${xmlEscape(`${siteUrl}${location}`)}</loc>`,
        date ? `    <lastmod>${date}</lastmod>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
};

const loadSitemapEntries = async (idMasterComp: number): Promise<SitemapEntry[]> => {
  const [pages] = await pool.query<RowDataPacket[]>(
    `SELECT page.website_page_key AS content_type,
            translation.website_page_locale AS locale,
            translation.website_page_path AS slug_or_path,
            GREATEST(page.updated, translation.updated) AS last_modified
       FROM website_page page
       INNER JOIN website_page_i18n translation
         ON translation.id_website_page = page.id_website_page
        AND translation.id_master_comp = page.id_master_comp
      WHERE page.id_master_comp = ?
        AND page.website_page_is_published = 1
        AND translation.website_page_translation_is_published = 1
        AND LOWER(REPLACE(COALESCE(translation.website_page_seo_robots, ''), ' ', '')) NOT LIKE '%noindex%'
        AND (page.website_page_publish_at IS NULL OR page.website_page_publish_at <= NOW())
        AND (page.website_page_unpublish_at IS NULL OR page.website_page_unpublish_at > NOW())`,
    [idMasterComp],
  );
  const [products] = await pool.query<RowDataPacket[]>(
    `SELECT 'product' AS content_type,
            translation.product_locale AS locale,
            translation.product_slug AS slug_or_path,
            GREATEST(product.updated, translation.updated) AS last_modified
       FROM product_catalog product
       INNER JOIN product_catalog_i18n translation
         ON translation.id_product = product.id_product
        AND translation.id_master_comp = product.id_master_comp
      WHERE product.id_master_comp = ?
        AND product.product_status = 'published'
        AND translation.product_i18n_status = 1
        AND product.product_deleted_at IS NULL`,
    [idMasterComp],
  );
  const [categories] = await pool.query<RowDataPacket[]>(
    `SELECT 'category' AS content_type,
            translation.product_category_locale AS locale,
            translation.product_category_slug AS slug_or_path,
            GREATEST(category.updated, translation.updated) AS last_modified
       FROM product_category category
       INNER JOIN product_category_i18n translation
         ON translation.id_product_category = category.id_product_category
        AND translation.id_master_comp = category.id_master_comp
      WHERE category.id_master_comp = ?
        AND category.product_category_status = 'published'
        AND translation.product_category_i18n_status = 1
        AND category.product_category_deleted_at IS NULL`,
    [idMasterComp],
  );
  const [articles] = await pool.query<RowDataPacket[]>(
    `SELECT 'article' AS content_type,
            translation.article_locale AS locale,
            translation.article_slug AS slug_or_path,
            GREATEST(article.updated, translation.updated) AS last_modified
       FROM article
       INNER JOIN article_i18n translation
         ON translation.id_article = article.id_article
        AND translation.id_master_comp = article.id_master_comp
      WHERE article.id_master_comp = ?
        AND (article.article_status = 'published'
          OR (article.article_status = 'scheduled' AND article.article_published_at IS NOT NULL))
        AND translation.article_i18n_status = 1
        AND article.article_deleted_at IS NULL
        AND (article.article_published_at IS NULL OR article.article_published_at <= UTC_TIMESTAMP())
        AND (article.article_unpublished_at IS NULL OR article.article_unpublished_at > UTC_TIMESTAMP())`,
    [idMasterComp],
  );

  const indexPages: SitemapEntry[] = [
    { location: '/katalog' },
    { location: '/en/catalog' },
    { location: '/artikel' },
    { location: '/en/articles' },
  ];

  return [
    ...indexPages,
    ...[...pages, ...products, ...categories, ...articles].map((row) => ({
      location: pagePath(row),
      lastModified: row.last_modified,
    })),
  ];
};

router.get('/robots.txt', (_req, res) => {
  const siteUrl = publicSiteUrl();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res
    .status(200)
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /account',
        'Disallow: /cart',
        'Disallow: /checkout',
        'Disallow: /compare',
        'Disallow: /coming-soon',
        'Disallow: /en/account',
        'Disallow: /en/cart',
        'Disallow: /en/search',
        'Disallow: /en/wishlist',
        'Disallow: /maintenance',
        'Disallow: /order',
        'Disallow: /search',
        'Disallow: /seller',
        'Disallow: /wishlist',
        `Sitemap: ${siteUrl}/sitemap.xml`,
        '',
      ].join('\n'),
    );
});

router.get('/sitemap.xml', async (_req, res) => {
  const idMasterComp = companyId();
  if (!idMasterComp) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).type('text/plain').send('Sitemap is not configured');
  }

  try {
    const xml = buildSitemapXml(publicSiteUrl(), await loadSitemapEntries(idMasterComp));
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[Public SEO] Sitemap generation failed', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).type('text/plain').send('Sitemap is temporarily unavailable');
  }
});

export default router;
