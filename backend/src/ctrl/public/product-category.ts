import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { isPublicContentLocale } from "../../config/public-content.config";
import { pool } from "../../db";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();
const publicScope = (locale: unknown) => {
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  return Number.isSafeInteger(company) && company > 0 && isPublicContentLocale(locale)
    ? { company, locale: String(locale) }
    : null;
};
const image = (row: any, prefix: string) =>
  row?.[`${prefix}_path`]
    ? {
        asset_url: buildAttachmentUrl(row[`${prefix}_path`]),
        original_url: buildAttachmentUrl(row[`${prefix}_path`]),
        name: row[`${prefix}_name`] ?? "",
        width: row[`${prefix}_width`] == null ? null : Number(row[`${prefix}_width`]),
        height: row[`${prefix}_height`] == null ? null : Number(row[`${prefix}_height`]),
      }
    : null;
const select = `SELECT c.id_product_category,c.id_parent_product_category,c.product_category_key,c.product_category_is_featured,c.product_category_sort_order,
  i.product_category_slug,i.product_category_name,i.product_category_description,i.product_category_meta_title,i.product_category_meta_description,i.product_category_canonical_url,i.product_category_og_title,i.product_category_og_description,
  img.storage_path image_path,img.name image_name,img.width image_width,img.height image_height,
  ico.storage_path icon_path,ico.name icon_name,ico.width icon_width,ico.height icon_height,
  og.storage_path og_path,og.name og_name,og.width og_width,og.height og_height
  FROM product_category c JOIN product_category_i18n i ON i.id_product_category=c.id_product_category AND i.id_master_comp=c.id_master_comp
  LEFT JOIN product_category_attachment cai ON cai.id_product_category=c.id_product_category AND cai.product_category_attachment_role='image' AND cai.product_category_attachment_is_public=1
  LEFT JOIN attachment img ON img.id_attachment=cai.id_attachment AND img.attachment_status=1 AND img.deleted_at IS NULL
  LEFT JOIN product_category_attachment cac ON cac.id_product_category=c.id_product_category AND cac.product_category_attachment_role='icon' AND cac.product_category_attachment_is_public=1
  LEFT JOIN attachment ico ON ico.id_attachment=cac.id_attachment AND ico.attachment_status=1 AND ico.deleted_at IS NULL
  LEFT JOIN product_category_attachment cao ON cao.id_product_category=c.id_product_category AND cao.product_category_attachment_role='og' AND cao.product_category_attachment_is_public=1
  LEFT JOIN attachment og ON og.id_attachment=cao.id_attachment AND og.attachment_status=1 AND og.deleted_at IS NULL`;
const where = `c.id_master_comp=? AND i.product_category_locale=? AND c.product_category_status='published' AND i.product_category_i18n_status=1 AND c.product_category_deleted_at IS NULL`;
const dto = (row: any) => ({
  id: Number(row.id_product_category),
  parent_id: row.id_parent_product_category == null ? null : Number(row.id_parent_product_category),
  key: row.product_category_key,
  name: row.product_category_name,
  slug: row.product_category_slug,
  description: row.product_category_description ?? "",
  type: "product",
  status: true,
  is_featured: Boolean(row.product_category_is_featured),
  sort_order: Number(row.product_category_sort_order ?? 0),
  meta_title: row.product_category_meta_title ?? row.product_category_name,
  meta_description: row.product_category_meta_description ?? row.product_category_description ?? "",
  canonical_url: row.product_category_canonical_url ?? "",
  og_title: row.product_category_og_title ?? row.product_category_meta_title ?? row.product_category_name,
  og_description: row.product_category_og_description ?? row.product_category_meta_description ?? row.product_category_description ?? "",
  category_image: image(row, "image"),
  category_icon: image(row, "icon"),
  category_meta_image: image(row, "og") ?? image(row, "image"),
  subcategories: [] as any[],
});
const tree = (items: any[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: any[] = [];
  for (const item of items) {
    if (item.parent_id && byId.has(item.parent_id)) byId.get(item.parent_id).subcategories.push(item);
    else roots.push(item);
  }
  return roots;
};

router.get("/api/public/product-categories/:locale", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const scope = publicScope(req.params.locale);
  if (!scope) return sendError(res, 404, "PRODUCT_CATEGORIES_NOT_FOUND", "Product categories not found");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${select} WHERE ${where} ORDER BY c.product_category_sort_order,i.product_category_name`,
      [scope.company, scope.locale],
    );
    const data = rows.map(dto);
    return sendSuccess(res, 200, "PRODUCT_CATEGORIES_FOUND", "Product categories loaded", { data: tree(data), total: data.length });
  } catch (error) {
    console.error("[Public product category] list failed", error);
    return sendError(res, 500, "PRODUCT_CATEGORIES_UNAVAILABLE", "Unable to load product categories");
  }
});

router.get("/api/public/product-categories/:locale/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const scope = publicScope(req.params.locale);
  if (!scope) return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${select} WHERE ${where} AND i.product_category_slug=? LIMIT 1`,
      [scope.company, scope.locale, req.params.slug],
    );
    if (!rows.length) return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
    return sendSuccess(res, 200, "PRODUCT_CATEGORY_FOUND", "Product category loaded", dto(rows[0]));
  } catch (error) {
    console.error("[Public product category] detail failed", error);
    return sendError(res, 500, "PRODUCT_CATEGORY_UNAVAILABLE", "Unable to load product category");
  }
});

export default router;
