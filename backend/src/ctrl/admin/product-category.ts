import express = require("express");
import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db = require("../../db");
import keyhsid from "../../hsid";
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from "../../config/public-content.config";
import { getAdminScope } from "../../helper/admin-scope.helper";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const app = express();
const { pool } = db;
const statuses = new Set(["draft", "published", "archived"]);

const decode = (value: unknown, codec: any): number | null => {
  const id = Number(codec.decode(String(value ?? ""))[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const slugify = (value: unknown) => normalizePublicContentKey(value).slice(0, 255);

const payloadOf = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const status = String(body?.status ?? "draft");
  const parentId = body?.parent_id
    ? decode(body.parent_id, keyhsid.idProductCategory)
    : null;
  const media = {
    image: body?.image_id ? decode(body.image_id, keyhsid.idAttachment) : null,
    icon: body?.icon_id ? decode(body.icon_id, keyhsid.idAttachment) : null,
    og: body?.og_image_id ? decode(body.og_image_id, keyhsid.idAttachment) : null,
  };
  if (
    !key ||
    key.length > 120 ||
    !statuses.has(status) ||
    (body?.parent_id && !parentId) ||
    (body?.image_id && !media.image) ||
    (body?.icon_id && !media.icon) ||
    (body?.og_image_id && !media.og) ||
    !Array.isArray(body?.translations)
  ) return null;

  const translations: any[] = [];
  const seen = new Set<string>();
  for (const item of body.translations) {
    const locale = String(item?.locale ?? "");
    const slug = slugify(item?.slug);
    const name = clean(item?.name, 255);
    if (!isPublicContentLocale(locale) || seen.has(locale) || !slug || !name) return null;
    seen.add(locale);
    translations.push({
      locale,
      slug,
      name,
      description: clean(item?.description, 4000) || null,
      metaTitle: clean(item?.meta_title, 255) || null,
      metaDescription: clean(item?.meta_description, 500) || null,
      canonicalUrl: clean(item?.canonical_url, 1000) || null,
      ogTitle: clean(item?.og_title, 255) || null,
      ogDescription: clean(item?.og_description, 500) || null,
      status: Number(item?.status) === 0 ? 0 : 1,
    });
  }
  if (!PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale))) return null;
  return {
    key,
    status,
    parentId,
    media,
    isFeatured: body?.is_featured ? 1 : 0,
    sortOrder: Math.max(0, Number(body?.sort_order) || 0),
    translations,
  };
};

const attachmentDto = (row: any, prefix: string) =>
  row?.[`${prefix}_id`]
    ? {
        id_attachment: keyhsid.idAttachment.encode(Number(row[`${prefix}_id`])),
        asset_url: buildAttachmentUrl(row[`${prefix}_path`]),
        original_url: buildAttachmentUrl(row[`${prefix}_path`]),
        name: row[`${prefix}_name`] ?? "",
        width: row[`${prefix}_width`] == null ? null : Number(row[`${prefix}_width`]),
        height: row[`${prefix}_height`] == null ? null : Number(row[`${prefix}_height`]),
        mime_type: row[`${prefix}_mime`] ?? "",
      }
    : null;

const listSelect = `SELECT c.id_product_category,c.id_parent_product_category,c.product_category_key,
  c.product_category_status,c.product_category_is_featured,c.product_category_sort_order,c.created,c.updated,
  i.product_category_name,i.product_category_slug,i.product_category_description,
  img.id_attachment image_id,img.storage_path image_path,img.name image_name,img.width image_width,img.height image_height,img.mime_type image_mime,
  ico.id_attachment icon_id,ico.storage_path icon_path,ico.name icon_name,ico.width icon_width,ico.height icon_height,ico.mime_type icon_mime
  FROM product_category c
  LEFT JOIN product_category_i18n i ON i.id_product_category=c.id_product_category AND i.product_category_locale=?
  LEFT JOIN product_category_attachment ai ON ai.id_product_category=c.id_product_category AND ai.product_category_attachment_role='image' AND ai.product_category_attachment_sort_order=0
  LEFT JOIN attachment img ON img.id_attachment=ai.id_attachment
  LEFT JOIN product_category_attachment ac ON ac.id_product_category=c.id_product_category AND ac.product_category_attachment_role='icon' AND ac.product_category_attachment_sort_order=0
  LEFT JOIN attachment ico ON ico.id_attachment=ac.id_attachment`;

const listDto = (row: any) => ({
  id: keyhsid.idProductCategory.encode(Number(row.id_product_category)),
  parent_id: row.id_parent_product_category
    ? keyhsid.idProductCategory.encode(Number(row.id_parent_product_category))
    : null,
  key: row.product_category_key,
  name: row.product_category_name ?? row.product_category_key,
  slug: row.product_category_slug ?? "",
  description: row.product_category_description ?? "",
  type: "product",
  status: row.product_category_status,
  is_featured: Boolean(row.product_category_is_featured),
  sort_order: Number(row.product_category_sort_order ?? 0),
  category_image: attachmentDto(row, "image"),
  category_icon: attachmentDto(row, "icon"),
  created_at: row.created,
  updated_at: row.updated,
  subcategories: [] as any[],
});

const makeTree = (items: any[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: any[] = [];
  for (const item of items) {
    if (item.parent_id && byId.has(item.parent_id)) byId.get(item.parent_id).subcategories.push(item);
    else roots.push(item);
  }
  return roots;
};

app.get(
  "/api/v1/product-categories",
  verifyToken,
  requirePermission("product_category.view"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const locale = isPublicContentLocale(req.query.locale) ? String(req.query.locale) : "id-ID";
    const search = clean(req.query.search, 200);
    const like = `%${search}%`;
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `${listSelect} WHERE c.id_master_comp=? AND c.product_category_deleted_at IS NULL
         AND (?='' OR c.product_category_key LIKE ? OR i.product_category_name LIKE ?)
         ORDER BY c.product_category_sort_order,i.product_category_name`,
        [locale, scope.idMasterComp, search, like, like],
      );
      const data = rows.map(listDto);
      return sendSuccess(res, 200, "PRODUCT_CATEGORIES_LISTED", "Product categories loaded", {
        data: makeTree(data),
        total: data.length,
      });
    } catch (error) {
      console.error("[Product category] list failed", error);
      return sendError(res, 500, "PRODUCT_CATEGORY_LIST_FAILED", "Unable to load product categories");
    }
  },
);

app.get(
  "/api/v1/product-categories/:id",
  verifyToken,
  requirePermission("product_category.view"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decode(req.params.id, keyhsid.idProductCategory);
    if (!id) return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_category WHERE id_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL`,
      [id, scope.idMasterComp],
    );
    if (!rows.length) return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_category_i18n WHERE id_product_category=? ORDER BY product_category_locale`,
      [id],
    );
    const [media] = await pool.query<RowDataPacket[]>(
      `SELECT ca.product_category_attachment_role,a.* FROM product_category_attachment ca JOIN attachment a ON a.id_attachment=ca.id_attachment WHERE ca.id_product_category=? AND ca.product_category_attachment_sort_order=0`,
      [id],
    );
    const mediaByRole = new Map(media.map((item) => [item.product_category_attachment_role, item]));
    const mediaDto = (role: string) => {
      const item = mediaByRole.get(role);
      return item
        ? attachmentDto({ [`${role}_id`]: item.id_attachment, [`${role}_path`]: item.storage_path, [`${role}_name`]: item.name, [`${role}_width`]: item.width, [`${role}_height`]: item.height, [`${role}_mime`]: item.mime_type }, role)
        : null;
    };
    const row = rows[0];
    return sendSuccess(res, 200, "PRODUCT_CATEGORY_FOUND", "Product category loaded", {
      id: req.params.id,
      parent_id: row.id_parent_product_category ? keyhsid.idProductCategory.encode(Number(row.id_parent_product_category)) : null,
      key: row.product_category_key,
      type: "product",
      status: row.product_category_status,
      is_featured: Boolean(row.product_category_is_featured),
      sort_order: Number(row.product_category_sort_order),
      category_image: mediaDto("image"),
      category_icon: mediaDto("icon"),
      category_meta_image: mediaDto("og"),
      translations: translations.map((item) => ({
        locale: item.product_category_locale,
        slug: item.product_category_slug,
        name: item.product_category_name,
        description: item.product_category_description ?? "",
        meta_title: item.product_category_meta_title ?? "",
        meta_description: item.product_category_meta_description ?? "",
        canonical_url: item.product_category_canonical_url ?? "",
        og_title: item.product_category_og_title ?? "",
        og_description: item.product_category_og_description ?? "",
        status: Number(item.product_category_i18n_status),
      })),
    });
  },
);

const save = async (req: AuthRequest, res: Response, id: number | null) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const payload = payloadOf(req.body);
  if (!payload) return sendError(res, 400, "PRODUCT_CATEGORY_PAYLOAD_INVALID", "Complete valid Indonesian and English category content");
  if (id && payload.parentId === id) return sendError(res, 400, "PRODUCT_CATEGORY_PARENT_INVALID", "A category cannot be its own parent");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (payload.parentId) {
      const [parent] = await connection.query<RowDataPacket[]>(
        `SELECT id_product_category FROM product_category WHERE id_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL`,
        [payload.parentId, scope.idMasterComp],
      );
      if (!parent.length) {
        await connection.rollback();
        return sendError(res, 400, "PRODUCT_CATEGORY_PARENT_INVALID", "Selected parent category is unavailable");
      }
      if (id) {
        let ancestorId: number | null = payload.parentId;
        const visited = new Set<number>();
        while (ancestorId && !visited.has(ancestorId)) {
          if (ancestorId === id) {
            await connection.rollback();
            return sendError(
              res,
              400,
              "PRODUCT_CATEGORY_PARENT_INVALID",
              "A category cannot be moved below one of its descendants",
            );
          }
          visited.add(ancestorId);
          const ancestorQuery = await connection.query<RowDataPacket[]>(
            `SELECT id_parent_product_category FROM product_category WHERE id_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL`,
            [ancestorId, scope.idMasterComp],
          );
          const ancestorRows: RowDataPacket[] = ancestorQuery[0];
          ancestorId = ancestorRows.length
            ? Number(ancestorRows[0].id_parent_product_category) || null
            : null;
        }
      }
    }
    let categoryId = id;
    if (id) {
      const [exists] = await connection.query<RowDataPacket[]>(
        `SELECT id_product_category FROM product_category WHERE id_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!exists.length) {
        await connection.rollback();
        return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
      }
      await connection.query(
        `UPDATE product_category SET id_parent_product_category=?,product_category_key=?,product_category_status=?,product_category_is_featured=?,product_category_sort_order=?,id_updated_by=? WHERE id_product_category=?`,
        [payload.parentId, payload.key, payload.status, payload.isFeatured, payload.sortOrder, scope.idAdminAcct, id],
      );
    } else {
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO product_category(id_master_comp,id_parent_product_category,product_category_key,product_category_status,product_category_is_featured,product_category_sort_order,id_created_by,id_updated_by) VALUES(?,?,?,?,?,?,?,?)`,
        [scope.idMasterComp, payload.parentId, payload.key, payload.status, payload.isFeatured, payload.sortOrder, scope.idAdminAcct, scope.idAdminAcct],
      );
      categoryId = insert.insertId;
    }
    for (const item of payload.translations) {
      await connection.query(
        `INSERT INTO product_category_i18n(id_product_category,id_master_comp,product_category_locale,product_category_slug,product_category_name,product_category_description,product_category_meta_title,product_category_meta_description,product_category_canonical_url,product_category_og_title,product_category_og_description,product_category_i18n_status)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE product_category_slug=VALUES(product_category_slug),product_category_name=VALUES(product_category_name),product_category_description=VALUES(product_category_description),product_category_meta_title=VALUES(product_category_meta_title),product_category_meta_description=VALUES(product_category_meta_description),product_category_canonical_url=VALUES(product_category_canonical_url),product_category_og_title=VALUES(product_category_og_title),product_category_og_description=VALUES(product_category_og_description),product_category_i18n_status=VALUES(product_category_i18n_status)`,
        [categoryId, scope.idMasterComp, item.locale, item.slug, item.name, item.description, item.metaTitle, item.metaDescription, item.canonicalUrl, item.ogTitle, item.ogDescription, item.status],
      );
    }
    await connection.query(`DELETE FROM product_category_attachment WHERE id_product_category=?`, [categoryId]);
    for (const role of ["image", "icon", "og"] as const) {
      const attachmentId = payload.media[role];
      if (!attachmentId) continue;
      const [valid] = await connection.query<RowDataPacket[]>(
        `SELECT id_attachment FROM attachment WHERE id_attachment=? AND id_master_comp=? AND attachment_status=1 AND deleted_at IS NULL`,
        [attachmentId, scope.idMasterComp],
      );
      if (!valid.length) {
        await connection.rollback();
        return sendError(res, 400, "PRODUCT_CATEGORY_MEDIA_INVALID", "Selected media is unavailable");
      }
      await connection.query(
        `INSERT INTO product_category_attachment(id_product_category,id_master_comp,id_attachment,product_category_attachment_role) VALUES(?,?,?,?)`,
        [categoryId, scope.idMasterComp, attachmentId, role],
      );
    }
    await writeAuditLog({
      req,
      connection,
      writeMode: "strict",
      idMasterComp: scope.idMasterComp,
      eventCode: id ? "product_category.updated" : "product_category.created",
      category: "data_change",
      module: "product_category",
      action: id ? "update" : "create",
      actorType: "admin",
      actorId: scope.idAdminAcct,
      actorLabel: req.user?.alias ?? null,
      entityType: "product_category",
      entityId: categoryId!,
      entityLabel: payload.key,
      after: payload,
      httpStatus: id ? 200 : 201,
    });
    await connection.commit();
    return sendSuccess(res, id ? 200 : 201, id ? "PRODUCT_CATEGORY_UPDATED" : "PRODUCT_CATEGORY_CREATED", id ? "Product category updated" : "Product category created", { id: keyhsid.idProductCategory.encode(categoryId!) });
  } catch (error: any) {
    await connection.rollback();
    if (error?.code === "ER_DUP_ENTRY") return sendError(res, 409, "PRODUCT_CATEGORY_CONFLICT", "Category key or localized slug already exists");
    console.error("[Product category] save failed", error);
    return sendError(res, 500, "PRODUCT_CATEGORY_SAVE_FAILED", "Unable to save product category");
  } finally {
    connection.release();
  }
};

app.post("/api/v1/product-categories", verifyToken, requirePermission("product_category.create"), (req, res) => save(req, res, null));
app.put("/api/v1/product-categories/:id", verifyToken, requirePermission("product_category.update"), (req, res) => {
  const id = decode(req.params.id, keyhsid.idProductCategory);
  return id ? save(req, res, id) : sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
});
app.delete("/api/v1/product-categories/:id", verifyToken, requirePermission("product_category.delete"), async (req: AuthRequest, res: Response) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const id = decode(req.params.id, keyhsid.idProductCategory);
  if (!id) return sendError(res, 404, "PRODUCT_CATEGORY_NOT_FOUND", "Product category not found");
  const [children] = await pool.query<RowDataPacket[]>(
    `SELECT id_product_category FROM product_category WHERE id_parent_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL LIMIT 1`,
    [id, scope.idMasterComp],
  );
  if (children.length) return sendError(res, 409, "PRODUCT_CATEGORY_HAS_CHILDREN", "Move or delete child categories first");
  await pool.query(
    `UPDATE product_category SET product_category_deleted_at=NOW(),id_updated_by=? WHERE id_product_category=? AND id_master_comp=?`,
    [scope.idAdminAcct, id, scope.idMasterComp],
  );
  return sendSuccess(res, 200, "PRODUCT_CATEGORY_DELETED", "Product category moved to trash", null);
});

export default app;
