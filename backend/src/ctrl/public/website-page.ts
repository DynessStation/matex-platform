import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../../db";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();

const SUPPORTED_LOCALES = new Set(["id-ID", "en-US"]);
const PUBLIC_MEDIA_SLOTS = [
  "home_main",
  "home_side_1",
  "home_side_2",
  "home_tile_1",
  "home_tile_2",
  "home_tile_3",
  "home_tile_4",
  "about_content",
  "gallery",
  "og",
] as const;

const parseJsonValue = (value: unknown): unknown | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Public company scope remains deployment-owned during the additive migration.
// No request parameter, cookie, or header may override it.
router.get("/api/public/website-page/:locale/:path", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const company = Number(process.env.PUBLIC_COMPANY_ID);
  if (!Number.isSafeInteger(company) || company <= 0) {
    return sendError(
      res,
      503,
      "WEBSITE_UNAVAILABLE",
      "Website content is not configured",
    );
  }

  const locale = String(req.params.locale);
  const pagePath = String(req.params.path);
  if (
    !SUPPORTED_LOCALES.has(locale) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pagePath) ||
    pagePath.length > 191
  ) {
    return sendError(res, 404, "WEBSITE_PAGE_NOT_FOUND", "Page not found");
  }

  try {
    const [pages] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          page.id_website_page,
          page.website_page_key,
          translation.website_page_locale,
          translation.website_page_path,
          translation.website_page_title,
          translation.website_page_summary,
          translation.website_page_body_html,
          translation.website_page_content_json,
          translation.website_page_seo_title,
          translation.website_page_seo_description,
          translation.website_page_seo_keywords,
          translation.website_page_seo_robots,
          translation.website_page_canonical_url,
          translation.website_page_social_title,
          translation.website_page_social_description
        FROM website_page page
        INNER JOIN website_page_i18n translation
          ON translation.id_website_page = page.id_website_page
          AND translation.id_master_comp = page.id_master_comp
        WHERE page.id_master_comp = ?
          AND translation.website_page_locale = ?
          AND translation.website_page_path = ?
          AND page.website_page_is_published = 1
          AND translation.website_page_translation_is_published = 1
          AND (
            page.website_page_publish_at IS NULL
            OR page.website_page_publish_at <= NOW()
          )
          AND (
            page.website_page_unpublish_at IS NULL
            OR page.website_page_unpublish_at > NOW()
          )
        LIMIT 1
      `,
      [company, locale, pagePath],
    );

    const page = pages[0];
    if (!page) {
      return sendError(res, 404, "WEBSITE_PAGE_NOT_FOUND", "Page not found");
    }

    const [translations] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          website_page_locale AS locale,
          website_page_path AS path
        FROM website_page_i18n
        WHERE id_website_page = ?
          AND id_master_comp = ?
          AND website_page_translation_is_published = 1
          AND website_page_locale IN ('id-ID', 'en-US')
        ORDER BY website_page_locale
      `,
      [page.id_website_page, company],
    );

    const [media] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          relation.website_page_media_slot AS slot,
          relation.website_page_media_click_action AS click_action,
          relation.website_page_media_click_target AS click_target,
          attachment.storage_path,
          attachment.name,
          media_text.website_page_media_alt_text AS alt_text,
          media_text.website_page_media_caption AS caption
        FROM website_page_media relation
        INNER JOIN attachment
          ON attachment.id_attachment = relation.id_attachment
        LEFT JOIN website_page_media_i18n media_text
          ON media_text.id_website_page_media = relation.id_website_page_media
          AND media_text.website_page_media_locale = ?
        WHERE relation.id_website_page = ?
          AND attachment.id_master_comp = ?
          AND relation.website_page_media_is_visible = 1
          AND attachment.attachment_status = 1
          AND attachment.deleted_at IS NULL
          AND attachment.mime_type IN (
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/avif'
          )
          AND relation.website_page_media_slot IN (
            ${PUBLIC_MEDIA_SLOTS.map(() => "?").join(", ")}
          )
        ORDER BY
          relation.website_page_media_sort_order,
          relation.id_website_page_media
      `,
      [locale, page.id_website_page, company, ...PUBLIC_MEDIA_SLOTS],
    );

    return sendSuccess(
      res,
      200,
      "WEBSITE_PAGE_FOUND",
      "Page loaded",
      {
        key: page.website_page_key,
        locale: page.website_page_locale,
        path: page.website_page_path,
        title: page.website_page_title,
        summary: page.website_page_summary,
        body_html: page.website_page_body_html,
        content: parseJsonValue(page.website_page_content_json),
        seo: {
          title: page.website_page_seo_title || page.website_page_title,
          description:
            page.website_page_seo_description ||
            page.website_page_summary ||
            "",
          keywords: page.website_page_seo_keywords || "",
          robots: page.website_page_seo_robots || "index, follow",
          canonical_url: page.website_page_canonical_url,
          social_title:
            page.website_page_social_title ||
            page.website_page_seo_title ||
            page.website_page_title,
          social_description:
            page.website_page_social_description ||
            page.website_page_seo_description ||
            page.website_page_summary ||
            "",
        },
        translations,
        media: media.map((item) => ({
          slot: item.slot,
          asset_url: buildAttachmentUrl(item.storage_path),
          alt_text: item.alt_text ?? item.name ?? "",
          caption: item.caption ?? "",
          click_action: item.click_action ?? "none",
          click_target: item.click_target ?? null,
        })),
      },
    );
  } catch (error) {
    console.error("[Public Website] Failed to load page", error);
    return sendError(
      res,
      500,
      "WEBSITE_UNAVAILABLE",
      "Unable to load page",
    );
  }
});

export default router;
