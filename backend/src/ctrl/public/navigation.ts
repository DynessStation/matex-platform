import { Router } from "express";
import { RowDataPacket } from "mysql2";

import { isCmsPageLocale } from "../../config/cms-page.config";
import { pool } from "../../db";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();

type NavigationRow = RowDataPacket & {
  id_web_navigation_item: number;
  id_parent_web_navigation_item: number | null;
  web_navigation_item_key: string;
  web_navigation_item_link_type: "cms_page" | "internal" | "external" | "label";
  web_navigation_item_target_blank: number;
  web_navigation_item_icon: string | null;
  web_navigation_item_badge_text: string | null;
  web_navigation_item_badge_color: string | null;
  web_navigation_item_sort_order: number;
  label: string | null;
  internal_path: string | null;
  external_url: string | null;
  cms_page_key: string | null;
  cms_page_template: string | null;
  cms_page_slug: string | null;
};

type PublicNavigationItem = {
  key: string;
  label: string;
  link_type: "cms_page" | "internal" | "external" | "label";
  path: string | null;
  url: string | null;
  target_blank: boolean;
  icon: string | null;
  badge: {
    text: string;
    color: string | null;
  } | null;
  children: PublicNavigationItem[];
};

const publicCmsPath = (
  locale: string,
  pageKey: string,
  template: string | null,
  slug: string,
): string => {
  if (pageKey === "home" || template === "home") {
    return locale === "en-US" ? "/en" : "/";
  }

  const encodedSlug = encodeURIComponent(slug);

  return locale === "en-US" ? `/en/${encodedSlug}` : `/${encodedSlug}`;
};

const validInternalPath = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const path = value.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return path;
};

const validExternalUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  try {
    const url = new URL(clean);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

router.get(
  "/api/public/navigation/:key/:locale",

  async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);

    if (!Number.isSafeInteger(company) || company <= 0) {
      return sendError(
        res,
        503,
        "NAVIGATION_UNAVAILABLE",
        "Navigation is not configured",
      );
    }

    const key = String(req.params.key ?? "")
      .trim()
      .toLowerCase();

    const locale = String(req.params.locale ?? "").trim();

    if (!key || key.length > 100 || !/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
      return sendError(
        res,
        404,
        "NAVIGATION_NOT_FOUND",
        "Navigation not found",
      );
    }

    if (!isCmsPageLocale(locale)) {
      return sendError(
        res,
        404,
        "NAVIGATION_NOT_FOUND",
        "Navigation not found",
      );
    }

    try {
      const [navigationRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT
            id_web_navigation,
            web_navigation_key,
            web_navigation_location,
            web_navigation_default_locale

          FROM web_navigation

          WHERE id_master_comp = ?

            AND web_navigation_key = ?

            AND web_navigation_status = 1

            AND web_navigation_deleted_at IS NULL

          LIMIT 1
        `,
        [company, key],
      );

      const navigation = navigationRows[0];

      if (!navigation) {
        return sendError(
          res,
          404,
          "NAVIGATION_NOT_FOUND",
          "Navigation not found",
        );
      }

      const defaultLocale = isCmsPageLocale(
        String(navigation.web_navigation_default_locale),
      )
        ? String(navigation.web_navigation_default_locale)
        : "id-ID";

      const [itemRows] = await pool.query<NavigationRow[]>(
        `
          SELECT
            item.id_web_navigation_item,

            item.id_parent_web_navigation_item,

            item.web_navigation_item_key,

            item.web_navigation_item_link_type,

            item.web_navigation_item_target_blank,

            item.web_navigation_item_icon,

            item.web_navigation_item_badge_text,

            item.web_navigation_item_badge_color,

            item.web_navigation_item_sort_order,

            COALESCE(
              requested_i18n.web_navigation_item_label,
              default_i18n.web_navigation_item_label
            ) AS label,

            requested_i18n.web_navigation_item_path
              AS internal_path,

            COALESCE(
              requested_i18n.web_navigation_item_url,
              default_i18n.web_navigation_item_url
            ) AS external_url,

            cms_page.cms_page_key,

            cms_page.cms_page_template,

            cms_page_i18n.cms_page_slug

          FROM web_navigation_item item

          LEFT JOIN web_navigation_item_i18n requested_i18n
            ON requested_i18n.id_web_navigation_item =
              item.id_web_navigation_item

            AND requested_i18n.id_master_comp =
              item.id_master_comp

            AND requested_i18n.web_navigation_item_locale = ?

            AND requested_i18n.web_navigation_item_i18n_status = 1

          LEFT JOIN web_navigation_item_i18n default_i18n
            ON default_i18n.id_web_navigation_item =
              item.id_web_navigation_item

            AND default_i18n.id_master_comp =
              item.id_master_comp

            AND default_i18n.web_navigation_item_locale = ?

            AND default_i18n.web_navigation_item_i18n_status = 1

          LEFT JOIN cms_page
            ON cms_page.id_cms_page = item.id_cms_page

            AND cms_page.id_master_comp =
              item.id_master_comp

            AND cms_page.cms_page_status = 1

            AND cms_page.cms_page_visibility IN (1, 2)

            AND cms_page.cms_page_deleted_at IS NULL

            AND (
              cms_page.cms_page_publish_at IS NULL

              OR cms_page.cms_page_publish_at <= NOW()
            )

            AND (
              cms_page.cms_page_unpublish_at IS NULL

              OR cms_page.cms_page_unpublish_at > NOW()
            )

          LEFT JOIN cms_page_i18n
            ON cms_page_i18n.id_cms_page =
              cms_page.id_cms_page

            AND cms_page_i18n.id_master_comp =
              cms_page.id_master_comp

            AND cms_page_i18n.cms_page_locale = ?

            AND cms_page_i18n.cms_page_i18n_status = 1

          WHERE item.id_web_navigation = ?

            AND item.id_master_comp = ?

            AND item.web_navigation_item_status = 1

            AND item.web_navigation_item_deleted_at IS NULL

          ORDER BY
            item.web_navigation_item_sort_order,

            item.id_web_navigation_item
        `,
        [locale, defaultLocale, locale, navigation.id_web_navigation, company],
      );

      const eligibleRows = new Map<number, NavigationRow>();

      for (const row of itemRows) {
        const id = Number(row.id_web_navigation_item);

        const label = String(row.label ?? "").trim();

        if (!Number.isSafeInteger(id) || id <= 0 || !label) {
          continue;
        }

        const linkType = row.web_navigation_item_link_type;

        if (
          linkType === "cms_page" &&
          (!row.cms_page_key || !row.cms_page_slug)
        ) {
          continue;
        }

        if (linkType === "internal" && !validInternalPath(row.internal_path)) {
          continue;
        }

        if (linkType === "external" && !validExternalUrl(row.external_url)) {
          continue;
        }

        eligibleRows.set(id, row);
      }

      const childrenByParent = new Map<number | null, NavigationRow[]>();

      for (const row of eligibleRows.values()) {
        const parentId =
          row.id_parent_web_navigation_item === null
            ? null
            : Number(row.id_parent_web_navigation_item);

        if (parentId !== null && !eligibleRows.has(parentId)) {
          continue;
        }

        const siblings = childrenByParent.get(parentId) ?? [];

        siblings.push(row);

        childrenByParent.set(parentId, siblings);
      }

      for (const siblings of childrenByParent.values()) {
        siblings.sort(
          (a, b) =>
            Number(a.web_navigation_item_sort_order) -
              Number(b.web_navigation_item_sort_order) ||
            Number(a.id_web_navigation_item) - Number(b.id_web_navigation_item),
        );
      }

      const buildItem = (
        row: NavigationRow,
        ancestors: Set<number>,
        depth: number,
      ): PublicNavigationItem | null => {
        const id = Number(row.id_web_navigation_item);

        if (ancestors.has(id) || depth > 20) {
          return null;
        }

        const nextAncestors = new Set(ancestors);

        nextAncestors.add(id);

        let path: string | null = null;

        let url: string | null = null;

        if (
          row.web_navigation_item_link_type === "cms_page" &&
          row.cms_page_key &&
          row.cms_page_slug
        ) {
          path = publicCmsPath(
            locale,
            row.cms_page_key,
            row.cms_page_template,
            row.cms_page_slug,
          );
        }

        if (row.web_navigation_item_link_type === "internal") {
          path = validInternalPath(row.internal_path);
        }

        if (row.web_navigation_item_link_type === "external") {
          url = validExternalUrl(row.external_url);
        }

        const children = (childrenByParent.get(id) ?? [])
          .map((child) => buildItem(child, nextAncestors, depth + 1))
          .filter((child): child is PublicNavigationItem => child !== null);

        const badgeText = String(
          row.web_navigation_item_badge_text ?? "",
        ).trim();

        return {
          key: row.web_navigation_item_key,

          label: String(row.label).trim(),

          link_type: row.web_navigation_item_link_type,

          path,

          url,

          target_blank:
            row.web_navigation_item_link_type === "external" &&
            Number(row.web_navigation_item_target_blank) === 1,

          icon: row.web_navigation_item_icon || null,

          badge: badgeText
            ? {
                text: badgeText,

                color: row.web_navigation_item_badge_color || null,
              }
            : null,

          children,
        };
      };

      const items = (childrenByParent.get(null) ?? [])
        .map((row) => buildItem(row, new Set<number>(), 0))
        .filter((item): item is PublicNavigationItem => item !== null);

      return sendSuccess(res, 200, "NAVIGATION_FOUND", "Navigation loaded", {
        key: navigation.web_navigation_key,

        location: navigation.web_navigation_location,

        locale,

        items,
      });
    } catch (error) {
      console.error("[Public Navigation] Failed to load navigation", error);

      return sendError(
        res,
        500,
        "NAVIGATION_UNAVAILABLE",
        "Unable to load navigation",
      );
    }
  },
);

export default router;
