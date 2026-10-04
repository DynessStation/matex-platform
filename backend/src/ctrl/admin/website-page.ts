import { Router, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db";
import keyhsid from "../../hsid";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";
import { validateCmsGadgetHomeMedia } from "../../config/cms-page.config";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const router = Router();
const FIXED_PAGE_KEYS = new Set([
  "home",
  "about",
  "contact",
  "faq",
  "terms",
  "career",
]);
const SUPPORTED_LOCALES = ["id-ID", "en-US"] as const;
const FIXED_PATHS: Record<
  string,
  Record<(typeof SUPPORTED_LOCALES)[number], string>
> = {
  home: { "id-ID": "home", "en-US": "home" },
  about: { "id-ID": "tentang-matex", "en-US": "about-matex" },
  contact: { "id-ID": "kontak", "en-US": "contact-us" },
  faq: { "id-ID": "faq", "en-US": "faq" },
  terms: { "id-ID": "syarat-ketentuan", "en-US": "terms-and-conditions" },
  career: { "id-ID": "karir", "en-US": "careers" },
};
const HOME_MEDIA_SLOTS = [
  "home_main",
  "home_side_1",
  "home_side_2",
  "home_tile_1",
  "home_tile_2",
  "home_tile_3",
  "home_tile_4",
] as const;
const PAGE_MEDIA_SLOTS: Record<string, Set<string>> = {
  home: new Set([...HOME_MEDIA_SLOTS, "og"]),
  about: new Set(["about_content", "og"]),
  contact: new Set(["og"]),
  faq: new Set(["og"]),
  terms: new Set(["og"]),
  career: new Set(["og"]),
};
const CLICK_ACTIONS = new Set([
  "none",
  "internal",
  "external",
  "product",
  "category",
]);

type SessionScope =
  | { success: true; idAdminAcct: number; idMasterComp: number }
  | { success: false; status: number; code: string; message: string };

const getSessionScope = async (req: AuthRequest): Promise<SessionScope> => {
  const idAdminAcct = req.user?.id_admin_acct;
  if (!idAdminAcct) {
    return {
      success: false,
      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id_admin_acct, id_master_comp, admin_acct_status
      FROM admin_acct
      WHERE id_admin_acct = ?
      LIMIT 1
    `,
    [idAdminAcct],
  );
  const account = rows[0];

  if (!account) {
    return {
      success: false,
      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }
  if (Number(account.admin_acct_status) !== 1) {
    return {
      success: false,
      status: 403,
      code: "AUTH_ACCOUNT_INACTIVE",
      message: "Your account is not active",
    };
  }

  return {
    success: true,
    idAdminAcct: Number(account.id_admin_acct),
    idMasterComp: Number(account.id_master_comp),
  };
};

const parseJsonValue = (value: unknown): unknown | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getEffectiveStatus = (
  isPublished: number,
  publishAt: string | Date | null,
  unpublishAt: string | Date | null,
): "draft" | "scheduled" | "published" | "expired" => {
  if (isPublished !== 1) return "draft";
  const now = Date.now();
  if (publishAt && new Date(publishAt).getTime() > now) return "scheduled";
  if (unpublishAt && new Date(unpublishAt).getTime() <= now) return "expired";
  return "published";
};

class PayloadError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const optionalString = (
  value: unknown,
  field: string,
  maximum: number,
): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > maximum) {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      `${field} is invalid or too long`,
    );
  }
  return value;
};

const jsonValue = (value: unknown, field: string): unknown | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      `${field} must be an object`,
    );
  }
  try {
    JSON.stringify(value);
    return value;
  } catch {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      `${field} must be valid JSON data`,
    );
  }
};

const dateValue = (value: unknown, field: string): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      `${field} is invalid`,
    );
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      `${field} is invalid`,
    );
  }
  return date;
};

const validateClickAction = (action: string, target: string | null): void => {
  if (!CLICK_ACTIONS.has(action)) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
      "Banner click action is invalid",
    );
  }
  if (action === "none") {
    if (target) {
      throw new PayloadError(
        "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
        "A banner without a click action cannot have a destination",
      );
    }
    return;
  }
  if (!target) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
      "Banner destination is required",
    );
  }
  if (action === "external" && !/^https:\/\/[^\s]+$/i.test(target)) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
      "External banner destinations must use HTTPS",
    );
  }
  if (
    action === "internal" &&
    (!/^\/(?!\/)[^\s]*$/.test(target) || target.includes(".."))
  ) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
      "Internal banner destinations must use a safe website path",
    );
  }
  if (
    (action === "product" || action === "category") &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)
  ) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_ACTION_INVALID",
      "Product and category destinations must use a valid address",
    );
  }
};

const parseSavePayload = (pageKey: string, body: any) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      "Website page data is incomplete",
    );
  }
  if (typeof body.is_published !== "boolean") {
    throw new PayloadError(
      "WEBSITE_PAGE_PAYLOAD_INVALID",
      "Publication status is required",
    );
  }

  const publishAt = dateValue(body.publish_at, "Publication start");
  const unpublishAt = dateValue(body.unpublish_at, "Publication end");
  if (publishAt && unpublishAt && unpublishAt <= publishAt) {
    throw new PayloadError(
      "WEBSITE_PAGE_PUBLICATION_WINDOW_INVALID",
      "Publication end must be later than its start",
    );
  }

  if (!Array.isArray(body.translations) || body.translations.length !== 2) {
    throw new PayloadError(
      "WEBSITE_PAGE_TRANSLATIONS_REQUIRED",
      "Indonesian and English content are required",
    );
  }
  const seenLocales = new Set<string>();
  const translations = body.translations.map((item: any) => {
    const locale = String(item?.locale ?? "");
    if (
      !SUPPORTED_LOCALES.includes(
        locale as (typeof SUPPORTED_LOCALES)[number],
      ) ||
      seenLocales.has(locale)
    ) {
      throw new PayloadError(
        "WEBSITE_PAGE_TRANSLATIONS_INVALID",
        "Each supported language must appear exactly once",
      );
    }
    seenLocales.add(locale);
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (
      !title ||
      title.length > 255 ||
      typeof item?.is_published !== "boolean"
    ) {
      throw new PayloadError(
        "WEBSITE_PAGE_TRANSLATIONS_INVALID",
        "Each language needs a valid title and publication status",
      );
    }
    const seo = item?.seo ?? {};
    const canonicalUrl = optionalString(
      seo.canonical_url,
      "Canonical URL",
      500,
    );
    if (canonicalUrl && !/^https?:\/\/[^\s]+$/i.test(canonicalUrl)) {
      throw new PayloadError(
        "WEBSITE_PAGE_TRANSLATIONS_INVALID",
        "Canonical URL must be an absolute HTTP or HTTPS URL",
      );
    }
    return {
      locale: locale as (typeof SUPPORTED_LOCALES)[number],
      path: FIXED_PATHS[pageKey][locale as (typeof SUPPORTED_LOCALES)[number]],
      title,
      summary: optionalString(item.summary, "Summary", 65535),
      bodyHtml: optionalString(item.body_html, "Page content", 2_000_000),
      content: jsonValue(item.content, "Structured page content"),
      seoTitle: optionalString(seo.title, "SEO title", 255),
      seoDescription: optionalString(seo.description, "SEO description", 500),
      seoKeywords: optionalString(seo.keywords, "SEO keywords", 500),
      seoRobots: optionalString(seo.robots, "Search engine instruction", 100),
      canonicalUrl,
      socialTitle: optionalString(seo.social_title, "Social title", 255),
      socialDescription: optionalString(
        seo.social_description,
        "Social description",
        500,
      ),
      schema: jsonValue(seo.schema, "Structured SEO data"),
      isPublished: item.is_published ? 1 : 0,
    };
  });

  if (!Array.isArray(body.media) || body.media.length > 10) {
    throw new PayloadError(
      "WEBSITE_PAGE_MEDIA_INVALID",
      "Page media selection is invalid",
    );
  }
  const seenSlots = new Set<string>();
  const seenAttachments = new Set<number>();
  const media = body.media.map((item: any, index: number) => {
    const decoded = keyhsid.idAttachment.decode(
      String(item?.id_attachment ?? ""),
    );
    const idAttachment = Number(decoded[0]);
    const slot = String(item?.slot ?? "");
    if (
      !Number.isSafeInteger(idAttachment) ||
      idAttachment <= 0 ||
      !PAGE_MEDIA_SLOTS[pageKey].has(slot) ||
      seenSlots.has(slot) ||
      seenAttachments.has(idAttachment) ||
      typeof item?.is_visible !== "boolean"
    ) {
      throw new PayloadError(
        "WEBSITE_PAGE_MEDIA_INVALID",
        "Page media contains an invalid or duplicate assignment",
      );
    }
    seenSlots.add(slot);
    seenAttachments.add(idAttachment);
    const clickAction = String(item.click_action ?? "none");
    const clickTarget = optionalString(
      item.click_target,
      "Banner destination",
      1000,
    );
    validateClickAction(clickAction, clickTarget);

    const texts = item.translations ?? [];
    if (!Array.isArray(texts) || texts.length > 2) {
      throw new PayloadError(
        "WEBSITE_PAGE_MEDIA_INVALID",
        "Media text is invalid",
      );
    }
    const textLocales = new Set<string>();
    const translations = texts.map((text: any) => {
      const locale = String(text?.locale ?? "");
      if (
        !SUPPORTED_LOCALES.includes(
          locale as (typeof SUPPORTED_LOCALES)[number],
        ) ||
        textLocales.has(locale)
      ) {
        throw new PayloadError(
          "WEBSITE_PAGE_MEDIA_INVALID",
          "Media languages must be unique and supported",
        );
      }
      textLocales.add(locale);
      return {
        locale,
        caption: optionalString(text.caption, "Media caption", 500),
        altText: optionalString(text.alt_text, "Alternative image text", 500),
      };
    });
    return {
      idAttachment,
      slot,
      sortOrder: index,
      isVisible: item.is_visible ? 1 : 0,
      clickAction,
      clickTarget,
      translations,
    };
  });

  if (body.is_published) {
    const visibleSlots = new Set(
      media
        .filter((item: any) => item.isVisible === 1)
        .map((item: any) => item.slot),
    );
    const requiredSlots =
      pageKey === "home"
        ? HOME_MEDIA_SLOTS
        : pageKey === "about"
          ? ["about_content"]
          : [];
    const missing = requiredSlots.filter((slot) => !visibleSlots.has(slot));
    if (missing.length) {
      throw new PayloadError(
        "WEBSITE_PAGE_MEDIA_REQUIRED",
        `Complete required page images: ${missing.join(", ")}`,
      );
    }
  }

  return {
    isPublished: body.is_published ? 1 : 0,
    publishAt,
    unpublishAt,
    translations,
    media,
  };
};

router.get(
  "/api/v1/website-page/:key",
  verifyToken,
  requirePermission("cms_page.view"),
  async (req: AuthRequest, res: Response) => {
    const pageKey = String(req.params.key).trim().toLowerCase();
    if (!FIXED_PAGE_KEYS.has(pageKey)) {
      return sendError(
        res,
        404,
        "WEBSITE_PAGE_NOT_FOUND",
        "Fixed website page not found",
      );
    }

    try {
      const scope = await getSessionScope(req);
      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const [pageRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT
            page.id_website_page,
            page.website_page_key,
            page.website_page_default_locale,
            page.website_page_is_published,
            page.website_page_publish_at,
            page.website_page_unpublish_at,
            page.created,
            page.updated,
            creator.alias AS created_by_alias,
            updater.alias AS updated_by_alias
          FROM website_page page
          LEFT JOIN admin_acct creator
            ON creator.id_admin_acct = page.id_created_by
          LEFT JOIN admin_acct updater
            ON updater.id_admin_acct = page.id_updated_by
          WHERE page.id_master_comp = ?
            AND page.website_page_key = ?
          LIMIT 1
        `,
        [scope.idMasterComp, pageKey],
      );
      const page = pageRows[0];
      if (!page) {
        return sendError(
          res,
          404,
          "WEBSITE_PAGE_NOT_FOUND",
          "Fixed website page not found",
        );
      }

      const [translationRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT
            website_page_locale,
            website_page_path,
            website_page_title,
            website_page_summary,
            website_page_body_html,
            website_page_content_json,
            website_page_seo_title,
            website_page_seo_description,
            website_page_seo_keywords,
            website_page_seo_robots,
            website_page_canonical_url,
            website_page_social_title,
            website_page_social_description,
            website_page_schema_json,
            website_page_translation_is_published,
            created,
            updated
          FROM website_page_i18n
          WHERE id_website_page = ?
            AND id_master_comp = ?
          ORDER BY website_page_locale
        `,
        [page.id_website_page, scope.idMasterComp],
      );

      const [mediaRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT
            relation.id_website_page_media,
            relation.id_attachment,
            relation.website_page_media_slot,
            relation.website_page_media_sort_order,
            relation.website_page_media_is_visible,
            relation.website_page_media_click_action,
            relation.website_page_media_click_target,
            relation.created,
            relation.updated,
            attachment.collection_name,
            attachment.name,
            attachment.original_name,
            attachment.file_name,
            attachment.mime_type,
            attachment.extension,
            attachment.file_size,
            attachment.width,
            attachment.height,
            attachment.storage_path,
            media_text.website_page_media_locale,
            media_text.website_page_media_caption,
            media_text.website_page_media_alt_text
          FROM website_page_media relation
          INNER JOIN attachment
            ON attachment.id_attachment = relation.id_attachment
          LEFT JOIN website_page_media_i18n media_text
            ON media_text.id_website_page_media = relation.id_website_page_media
          WHERE relation.id_website_page = ?
            AND attachment.id_master_comp = ?
            AND attachment.attachment_status = 1
            AND attachment.deleted_at IS NULL
          ORDER BY
            relation.website_page_media_sort_order,
            relation.id_website_page_media,
            media_text.website_page_media_locale
        `,
        [page.id_website_page, scope.idMasterComp],
      );

      const mediaByRelation = new Map<number, any>();
      for (const row of mediaRows) {
        const relationId = Number(row.id_website_page_media);
        let media = mediaByRelation.get(relationId);
        if (!media) {
          media = {
            id_attachment: keyhsid.idAttachment.encode(
              Number(row.id_attachment),
            ),
            slot: String(row.website_page_media_slot),
            sort_order: Number(row.website_page_media_sort_order),
            is_visible: Number(row.website_page_media_is_visible) === 1,
            click_action: String(row.website_page_media_click_action),
            click_target: row.website_page_media_click_target ?? null,
            collection_name: row.collection_name,
            name: row.name,
            original_name: row.original_name,
            file_name: row.file_name,
            mime_type: row.mime_type,
            extension: row.extension,
            file_size: Number(row.file_size),
            width: row.width === null ? null : Number(row.width),
            height: row.height === null ? null : Number(row.height),
            asset_url: buildAttachmentUrl(row.storage_path),
            translations: [],
            created: row.created,
            updated: row.updated,
          };
          mediaByRelation.set(relationId, media);
        }

        if (row.website_page_media_locale) {
          media.translations.push({
            locale: String(row.website_page_media_locale),
            caption: row.website_page_media_caption ?? null,
            alt_text: row.website_page_media_alt_text ?? null,
          });
        }
      }

      const isPublished = Number(page.website_page_is_published);
      return sendSuccess(
        res,
        200,
        "WEBSITE_PAGE_DETAIL_FETCHED",
        "Fixed website page loaded",
        {
          key: String(page.website_page_key),
          default_locale: String(page.website_page_default_locale),
          is_published: isPublished === 1,
          effective_status: getEffectiveStatus(
            isPublished,
            page.website_page_publish_at,
            page.website_page_unpublish_at,
          ),
          publish_at: page.website_page_publish_at ?? null,
          unpublish_at: page.website_page_unpublish_at ?? null,
          translations: translationRows.map((translation) => ({
            locale: String(translation.website_page_locale),
            path: String(translation.website_page_path),
            title: String(translation.website_page_title),
            summary: translation.website_page_summary ?? null,
            body_html: translation.website_page_body_html ?? null,
            content: parseJsonValue(translation.website_page_content_json),
            seo: {
              title: translation.website_page_seo_title ?? null,
              description: translation.website_page_seo_description ?? null,
              keywords: translation.website_page_seo_keywords ?? null,
              robots: translation.website_page_seo_robots ?? null,
              canonical_url: translation.website_page_canonical_url ?? null,
              social_title: translation.website_page_social_title ?? null,
              social_description:
                translation.website_page_social_description ?? null,
              schema: parseJsonValue(translation.website_page_schema_json),
            },
            is_published:
              Number(translation.website_page_translation_is_published) === 1,
            created: translation.created,
            updated: translation.updated,
          })),
          media: [...mediaByRelation.values()],
          created_by: page.created_by_alias ?? null,
          updated_by: page.updated_by_alias ?? null,
          created: page.created,
          updated: page.updated,
        },
      );
    } catch (error) {
      console.error("[Admin Website] Failed to load fixed page", error);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

router.put(
  "/api/v1/website-page/:key",
  verifyToken,
  requirePermission("cms_page.update"),
  async (req: AuthRequest, res: Response) => {
    const pageKey = String(req.params.key).trim().toLowerCase();
    if (!FIXED_PAGE_KEYS.has(pageKey)) {
      return sendError(
        res,
        404,
        "WEBSITE_PAGE_NOT_FOUND",
        "Fixed website page not found",
      );
    }

    const scope = await getSessionScope(req);
    if (!scope.success) {
      return sendError(res, scope.status, scope.code, scope.message);
    }

    let payload: ReturnType<typeof parseSavePayload>;
    try {
      payload = parseSavePayload(pageKey, req.body);
    } catch (error) {
      if (error instanceof PayloadError) {
        return sendError(res, 400, error.code, error.message);
      }
      return sendError(
        res,
        400,
        "WEBSITE_PAGE_PAYLOAD_INVALID",
        "Website page data is invalid",
      );
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [pageRows] = await connection.query<RowDataPacket[]>(
        `
          SELECT id_website_page, website_page_is_published
          FROM website_page
          WHERE id_master_comp = ?
            AND website_page_key = ?
          LIMIT 1
          FOR UPDATE
        `,
        [scope.idMasterComp, pageKey],
      );
      const page = pageRows[0];
      if (!page) {
        await connection.rollback();
        return sendError(
          res,
          404,
          "WEBSITE_PAGE_NOT_FOUND",
          "Fixed website page not found",
        );
      }

      const attachmentIds = payload.media.map(
        (item: { idAttachment: number }) => item.idAttachment,
      );
      const attachmentById = new Map<number, RowDataPacket>();
      if (attachmentIds.length) {
        const placeholders = attachmentIds.map(() => "?").join(", ");
        const [attachmentRows] = await connection.query<RowDataPacket[]>(
          `
            SELECT id_attachment, mime_type, width, height
            FROM attachment
            WHERE id_attachment IN (${placeholders})
              AND id_master_comp = ?
              AND collection_name = 'media_library'
              AND attachment_status = 1
              AND deleted_at IS NULL
          `,
          [...attachmentIds, scope.idMasterComp],
        );
        for (const row of attachmentRows) {
          attachmentById.set(Number(row.id_attachment), row);
        }
      }

      if (attachmentById.size !== attachmentIds.length) {
        await connection.rollback();
        return sendError(
          res,
          400,
          "WEBSITE_PAGE_MEDIA_UNAVAILABLE",
          "One or more selected images are unavailable",
        );
      }

      for (const item of payload.media) {
        const attachment = attachmentById.get(item.idAttachment)!;
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            String(attachment.mime_type),
          )
        ) {
          await connection.rollback();
          return sendError(
            res,
            400,
            "WEBSITE_PAGE_MEDIA_TYPE_INVALID",
            "Page images must use JPEG, PNG, or WebP",
          );
        }
        if (pageKey === "home" && item.slot !== "og") {
          const issue = validateCmsGadgetHomeMedia(item.slot, {
            mimeType: String(attachment.mime_type),
            width: attachment.width === null ? null : Number(attachment.width),
            height:
              attachment.height === null ? null : Number(attachment.height),
          });
          if (issue) {
            await connection.rollback();
            return sendError(res, 400, issue.code, issue.message, {
              slot: item.slot,
            });
          }
        }
      }

      const publishAt = payload.isPublished ? payload.publishAt : null;
      const unpublishAt = payload.isPublished ? payload.unpublishAt : null;
      await connection.query(
        `
          UPDATE website_page
          SET website_page_is_published = ?,
            website_page_publish_at = ?,
            website_page_unpublish_at = ?,
            id_updated_by = ?,
            updated = NOW()
          WHERE id_website_page = ?
            AND id_master_comp = ?
        `,
        [
          payload.isPublished,
          publishAt,
          unpublishAt,
          scope.idAdminAcct,
          page.id_website_page,
          scope.idMasterComp,
        ],
      );

      for (const translation of payload.translations) {
        await connection.query(
          `
            INSERT INTO website_page_i18n
            (
              id_website_page,
              id_master_comp,
              website_page_locale,
              website_page_path,
              website_page_title,
              website_page_summary,
              website_page_body_html,
              website_page_content_json,
              website_page_seo_title,
              website_page_seo_description,
              website_page_seo_keywords,
              website_page_seo_robots,
              website_page_canonical_url,
              website_page_social_title,
              website_page_social_description,
              website_page_schema_json,
              website_page_translation_is_published
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              website_page_path = VALUES(website_page_path),
              website_page_title = VALUES(website_page_title),
              website_page_summary = VALUES(website_page_summary),
              website_page_body_html = VALUES(website_page_body_html),
              website_page_content_json = VALUES(website_page_content_json),
              website_page_seo_title = VALUES(website_page_seo_title),
              website_page_seo_description = VALUES(website_page_seo_description),
              website_page_seo_keywords = VALUES(website_page_seo_keywords),
              website_page_seo_robots = VALUES(website_page_seo_robots),
              website_page_canonical_url = VALUES(website_page_canonical_url),
              website_page_social_title = VALUES(website_page_social_title),
              website_page_social_description = VALUES(website_page_social_description),
              website_page_schema_json = VALUES(website_page_schema_json),
              website_page_translation_is_published = VALUES(website_page_translation_is_published),
              updated = NOW()
          `,
          [
            page.id_website_page,
            scope.idMasterComp,
            translation.locale,
            translation.path,
            translation.title,
            translation.summary,
            translation.bodyHtml,
            translation.content === null
              ? null
              : JSON.stringify(translation.content),
            translation.seoTitle,
            translation.seoDescription,
            translation.seoKeywords,
            translation.seoRobots,
            translation.canonicalUrl,
            translation.socialTitle,
            translation.socialDescription,
            translation.schema === null
              ? null
              : JSON.stringify(translation.schema),
            translation.isPublished,
          ],
        );
      }

      await connection.query(
        "DELETE FROM website_page_media WHERE id_website_page = ?",
        [page.id_website_page],
      );
      for (const item of payload.media) {
        const [result] = await connection.query<ResultSetHeader>(
          `
            INSERT INTO website_page_media
            (
              id_website_page,
              id_attachment,
              website_page_media_slot,
              website_page_media_sort_order,
              website_page_media_is_visible,
              website_page_media_click_action,
              website_page_media_click_target
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            page.id_website_page,
            item.idAttachment,
            item.slot,
            item.sortOrder,
            item.isVisible,
            item.clickAction,
            item.clickTarget,
          ],
        );
        for (const translation of item.translations) {
          await connection.query(
            `
              INSERT INTO website_page_media_i18n
              (
                id_website_page_media,
                website_page_media_locale,
                website_page_media_caption,
                website_page_media_alt_text
              )
              VALUES (?, ?, ?, ?)
            `,
            [
              result.insertId,
              translation.locale,
              translation.caption,
              translation.altText,
            ],
          );
        }
      }

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "website_page.updated",
        category: "data_change",
        module: "website_page",
        action: "update",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "website_page",
        entityId: Number(page.id_website_page),
        entityLabel: pageKey,
        before: {
          is_published: Number(page.website_page_is_published) === 1,
        },
        after: {
          is_published: payload.isPublished === 1,
          translations: payload.translations.map(
            (item: { locale: string; isPublished: number }) => ({
              locale: item.locale,
              is_published: item.isPublished === 1,
            }),
          ),
          media_slots: payload.media.map((item: { slot: string }) => item.slot),
        },
        httpStatus: 200,
      });

      await connection.commit();
      return sendSuccess(
        res,
        200,
        "WEBSITE_PAGE_UPDATED",
        "Fixed website page saved",
        { key: pageKey },
      );
    } catch (error: any) {
      await connection.rollback();
      console.error("[Admin Website] Failed to save fixed page", error);
      if (error?.code === "ER_DUP_ENTRY") {
        return sendError(
          res,
          409,
          "WEBSITE_PAGE_CONFLICT",
          "A localized website address is already in use",
        );
      }
      return sendError(
        res,
        500,
        "WEBSITE_PAGE_SAVE_FAILED",
        "Unable to save fixed website page",
      );
    } finally {
      connection.release();
    }
  },
);

export default router;
