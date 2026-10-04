import { Router } from "express";
import { RowDataPacket } from "mysql2";

import { isPublicContentLocale } from "../../config/public-content.config";
import {
  getFixedWebNavigationPath,
  isFixedWebNavigationKey,
} from "../../config/web-navigation.config";
import { pool } from "../../db";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();

type NavigationRow = RowDataPacket & {
  id_web_navigation_item: number;
  web_navigation_item_key: string;
  web_navigation_item_sort_order: number;
  label: string | null;
};

type PublicNavigationItem = {
  key: string;
  label: string;
  link_type: "internal";
  path: string;
  url: null;
  target_blank: false;
  icon: null;
  badge: null;
  children: [];
};

router.get("/api/public/navigation/:key/:locale", async (req, res) => {
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

  if (key !== "primary" || !isPublicContentLocale(locale)) {
    return sendError(res, 404, "NAVIGATION_NOT_FOUND", "Navigation not found");
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

    const configuredDefaultLocale = String(
      navigation.web_navigation_default_locale ?? "",
    );
    const defaultLocale = isPublicContentLocale(configuredDefaultLocale)
      ? configuredDefaultLocale
      : "id-ID";

    const [itemRows] = await pool.query<NavigationRow[]>(
      `
        SELECT
          item.id_web_navigation_item,
          item.web_navigation_item_key,
          item.web_navigation_item_sort_order,
          COALESCE(
            requested_i18n.web_navigation_item_label,
            default_i18n.web_navigation_item_label
          ) AS label
        FROM web_navigation_item item
        LEFT JOIN web_navigation_item_i18n requested_i18n
          ON requested_i18n.id_web_navigation_item = item.id_web_navigation_item
          AND requested_i18n.id_master_comp = item.id_master_comp
          AND requested_i18n.web_navigation_item_locale = ?
          AND requested_i18n.web_navigation_item_i18n_status = 1
        LEFT JOIN web_navigation_item_i18n default_i18n
          ON default_i18n.id_web_navigation_item = item.id_web_navigation_item
          AND default_i18n.id_master_comp = item.id_master_comp
          AND default_i18n.web_navigation_item_locale = ?
          AND default_i18n.web_navigation_item_i18n_status = 1
        WHERE item.id_web_navigation = ?
          AND item.id_master_comp = ?
          AND item.web_navigation_item_status = 1
          AND item.web_navigation_item_deleted_at IS NULL
        ORDER BY
          item.web_navigation_item_sort_order,
          item.id_web_navigation_item
      `,
      [locale, defaultLocale, navigation.id_web_navigation, company],
    );

    const seenKeys = new Set<string>();
    const items: PublicNavigationItem[] = [];

    for (const row of itemRows) {
      const storedKey = String(row.web_navigation_item_key ?? "")
        .trim()
        .toLowerCase();
      const normalizedKey = storedKey === "blog" ? "articles" : storedKey;
      const label = String(row.label ?? "").trim();

      if (
        !isFixedWebNavigationKey(normalizedKey) ||
        !label ||
        seenKeys.has(normalizedKey)
      ) {
        continue;
      }

      seenKeys.add(normalizedKey);
      items.push({
        key: normalizedKey,
        label,
        link_type: "internal",
        path: getFixedWebNavigationPath(normalizedKey, locale),
        url: null,
        target_blank: false,
        icon: null,
        badge: null,
        children: [],
      });
    }

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
});

export default router;
