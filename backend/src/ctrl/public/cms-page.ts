import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../../db";
import { isCmsPageLocale } from "../../config/cms-page.config";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();

// Public scope is deployment-owned. Never resolve it from a query, cookie or header.
router.get("/api/public/cms-page/:locale/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  if (!Number.isSafeInteger(company) || company <= 0) {
    return sendError(res, 503, "CMS_UNAVAILABLE", "CMS is not configured");
  }

  const locale = String(req.params.locale);
  const slug = String(req.params.slug);
  if (!isCmsPageLocale(locale) || !slug || slug.length > 191) {
    return sendError(res, 404, "CMS_PAGE_NOT_FOUND", "Page not found");
  }

  try {
    const [pages] = await pool.query<RowDataPacket[]>(
      `
      SELECT p.id_cms_page,
        p.cms_page_key,
        p.cms_page_visibility,
        t.cms_page_locale, t.cms_page_slug, t.cms_page_title,
        t.cms_page_excerpt, t.cms_page_content, t.cms_page_meta_title,
        t.cms_page_meta_description, t.cms_page_meta_keywords,
        t.cms_page_meta_robots, t.cms_page_canonical_url,
        t.cms_page_og_title, t.cms_page_og_description
      FROM cms_page p
      INNER JOIN cms_page_i18n t ON t.id_cms_page = p.id_cms_page
        AND t.id_master_comp = p.id_master_comp
      WHERE p.id_master_comp = ? AND t.cms_page_locale = ? AND t.cms_page_slug = ?
        AND p.cms_page_deleted_at IS NULL AND p.cms_page_status = 1
        AND p.cms_page_visibility IN (1, 2) AND t.cms_page_i18n_status = 1
        AND p.cms_page_content_mode = 'html'
        AND (p.cms_page_publish_at IS NULL OR p.cms_page_publish_at <= NOW())
        AND (p.cms_page_unpublish_at IS NULL OR p.cms_page_unpublish_at > NOW())
      LIMIT 1
    `,
      [company, locale, slug],
    );

    const page = pages[0];
    if (!page)
      return sendError(res, 404, "CMS_PAGE_NOT_FOUND", "Page not found");

    const [translations] = await pool.query<RowDataPacket[]>(
      `
      SELECT cms_page_locale AS locale, cms_page_slug AS slug
      FROM cms_page_i18n
      WHERE id_cms_page = ? AND id_master_comp = ? AND cms_page_i18n_status = 1
        AND cms_page_locale IN ('id-ID', 'en-US')
      ORDER BY cms_page_locale
    `,
      [page.id_cms_page, company],
    );

    const [attachments] = await pool.query<RowDataPacket[]>(
      `
      SELECT c.cms_page_attachment_role AS role, a.storage_path, a.name,
        i.cms_page_attachment_alt_text AS alt, i.cms_page_attachment_caption AS caption
      FROM cms_page_attachment c
      INNER JOIN attachment a ON a.id_attachment = c.id_attachment
      LEFT JOIN cms_page_attachment_i18n i
        ON i.id_cms_page_attachment = c.id_cms_page_attachment
        AND i.cms_page_attachment_locale = ?
      WHERE c.id_cms_page = ? AND a.id_master_comp = ?
        AND c.cms_page_attachment_is_public = 1
        AND a.attachment_status = 1 AND a.deleted_at IS NULL
        AND a.mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif')
        AND c.cms_page_attachment_role IN ('hero', 'gallery', 'og')
      ORDER BY c.cms_page_attachment_sort_order, c.id_cms_page_attachment
    `,
      [locale, page.id_cms_page, company],
    );

    // Explicit public projection: no internal IDs, drafts, settings or audit data.
    return sendSuccess(res, 200, "CMS_PAGE_FOUND", "Page loaded", {
      key: page.cms_page_key,
      locale: page.cms_page_locale,
      slug: page.cms_page_slug,
      title: page.cms_page_title,
      excerpt: page.cms_page_excerpt,
      content: page.cms_page_content,
      seo: {
        title: page.cms_page_meta_title || page.cms_page_title,
        description:
          page.cms_page_meta_description || page.cms_page_excerpt || "",
        keywords: page.cms_page_meta_keywords || "",
        robots:
          Number(page.cms_page_visibility) === 2
            ? "noindex, nofollow"
            : page.cms_page_meta_robots || "index, follow",
        canonical_url: page.cms_page_canonical_url,
        og_title:
          page.cms_page_og_title ||
          page.cms_page_meta_title ||
          page.cms_page_title,
        og_description:
          page.cms_page_og_description ||
          page.cms_page_meta_description ||
          page.cms_page_excerpt ||
          "",
      },
      translations,
      attachments: attachments.map((item) => ({
        role: item.role,
        asset_url: buildAttachmentUrl(item.storage_path),
        alt: item.alt ?? item.name ?? "",
        caption: item.caption ?? "",
      })),
    });
  } catch (error) {
    console.error("[Public CMS] Failed to load page", error);
    return sendError(res, 500, "CMS_UNAVAILABLE", "Unable to load page");
  }
});

export default router;
