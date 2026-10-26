// Product categories (a tree; both languages per category; image, icon, and share image), under
// /api/v1/product-categories. The public list and detail are ctrl/public/product-category.ts.
// Positions are kept by the server per level (siblings 1..n, helper/sort-order.helper.ts): a new
// or moved category goes last among its new siblings, and the tree drag saves a level through
// /reorder, which is registered before /:id. Contract: ops/e2e/write/product-category-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import { countOf } from '../../helper/list-query.helper';
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from '../../config/public-content.config';
import { AdminScope, getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../helper/attachment.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { contentSlug, trimTo } from '../../helper/input.helper';
import { nextPosition, renumber, SortGroup, writeOrder } from '../../helper/sort-order.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const STATUSES = new Set(['draft', 'published', 'archived']);
const MEDIA_ROLES = ['image', 'icon', 'og'] as const;

const CONFLICT = {
  code: 'PRODUCT_CATEGORY_CONFLICT',
  message: 'Category key or localized slug already exists',
};

const readTranslations = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const translations = [];
  const seen = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? '');
    const slug = contentSlug(item?.slug);
    const name = trimTo(item?.name, 255);
    if (!isPublicContentLocale(locale) || seen.has(locale) || !slug || !name) return null;
    seen.add(locale);
    translations.push({
      locale,
      slug,
      name,
      description: trimTo(item?.description, 4000) || null,
      metaTitle: trimTo(item?.meta_title, 255) || null,
      metaDescription: trimTo(item?.meta_description, 500) || null,
      canonicalUrl: trimTo(item?.canonical_url, 1000) || null,
      ogTitle: trimTo(item?.og_title, 255) || null,
      ogDescription: trimTo(item?.og_description, 500) || null,
      status: Number(item?.status) === 0 ? 0 : 1,
    });
  }
  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale)) ? translations : null;
};

/** The save body, or null when anything is missing or invalid. */
const payloadOf = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const status = String(body?.status ?? 'draft');
  const parentId = body?.parent_id ? decodeId(body.parent_id, keyhsid.idProductCategory) : null;
  const media = {
    image: body?.image_id ? decodeId(body.image_id, keyhsid.idAttachment) : null,
    icon: body?.icon_id ? decodeId(body.icon_id, keyhsid.idAttachment) : null,
    og: body?.og_image_id ? decodeId(body.og_image_id, keyhsid.idAttachment) : null,
  };
  if (
    !key ||
    key.length > 120 ||
    !STATUSES.has(status) ||
    (body?.parent_id && !parentId) ||
    (body?.image_id && !media.image) ||
    (body?.icon_id && !media.icon) ||
    (body?.og_image_id && !media.og)
  ) {
    return null;
  }
  const translations = readTranslations(body?.translations);
  if (!translations) return null;
  return {
    key,
    status,
    parentId,
    media,
    isFeatured: body?.is_featured ? 1 : 0,
    translations,
  };
};

type CategoryPayload = NonNullable<ReturnType<typeof payloadOf>>;

const mediaDto = (media: any) =>
  media?.id_attachment
    ? {
        id_attachment: keyhsid.idAttachment.encode(Number(media.id_attachment)),
        asset_url: buildAttachmentUrl(media.storage_path),
        original_url: buildAttachmentUrl(media.storage_path),
        name: media.name ?? '',
        width: media.width == null ? null : Number(media.width),
        height: media.height == null ? null : Number(media.height),
        mime_type: media.mime_type ?? '',
      }
    : null;

// The list row carries image and icon columns under a prefix (image_*, icon_*).
const prefixedMedia = (row: any, prefix: string) =>
  mediaDto({
    id_attachment: row[`${prefix}_id`],
    storage_path: row[`${prefix}_path`],
    name: row[`${prefix}_name`],
    width: row[`${prefix}_width`],
    height: row[`${prefix}_height`],
    mime_type: row[`${prefix}_mime`],
  });

const LIST_SELECT = `SELECT c.id_product_category, c.id_parent_product_category,
    c.product_category_key, c.product_category_status, c.product_category_is_featured,
    c.product_category_sort_order, c.created, c.updated,
    i.product_category_name, i.product_category_slug, i.product_category_description,
    img.id_attachment image_id, img.storage_path image_path, img.name image_name,
    img.width image_width, img.height image_height, img.mime_type image_mime,
    ico.id_attachment icon_id, ico.storage_path icon_path, ico.name icon_name,
    ico.width icon_width, ico.height icon_height, ico.mime_type icon_mime,
    (SELECT COUNT(DISTINCT pc.id_product) FROM product_catalog_category pc
     JOIN product_catalog p ON p.id_product = pc.id_product AND p.product_deleted_at IS NULL
     WHERE pc.id_product_category = c.id_product_category) product_count
  FROM product_category c
  LEFT JOIN product_category_i18n i ON i.id_product_category = c.id_product_category
    AND i.product_category_locale = ?
  LEFT JOIN product_category_attachment ai ON ai.id_product_category = c.id_product_category
    AND ai.product_category_attachment_role = 'image'
    AND ai.product_category_attachment_sort_order = 0
  LEFT JOIN attachment img ON img.id_attachment = ai.id_attachment
  LEFT JOIN product_category_attachment ac ON ac.id_product_category = c.id_product_category
    AND ac.product_category_attachment_role = 'icon'
    AND ac.product_category_attachment_sort_order = 0
  LEFT JOIN attachment ico ON ico.id_attachment = ac.id_attachment`;

const listDto = (row: any) => ({
  id: keyhsid.idProductCategory.encode(Number(row.id_product_category)),
  parent_id: row.id_parent_product_category
    ? keyhsid.idProductCategory.encode(Number(row.id_parent_product_category))
    : null,
  key: row.product_category_key,
  name: row.product_category_name ?? row.product_category_key,
  slug: row.product_category_slug ?? '',
  description: row.product_category_description ?? '',
  type: 'product',
  status: row.product_category_status,
  is_featured: Boolean(row.product_category_is_featured),
  sort_order: Number(row.product_category_sort_order ?? 0),
  product_count: Number(row.product_count ?? 0),
  category_image: prefixedMedia(row, 'image'),
  category_icon: prefixedMedia(row, 'icon'),
  created_at: row.created,
  updated_at: row.updated,
  subcategories: [] as any[],
});

// Categories whose parent is not in the list become roots.
const makeTree = (items: ReturnType<typeof listDto>[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots = [];
  for (const item of items) {
    const parent = item.parent_id ? byId.get(item.parent_id) : undefined;
    if (parent) parent.subcategories.push(item);
    else roots.push(item);
  }
  return roots;
};

const categoryNotFound = (res: Response) =>
  sendError(res, 404, 'PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found');

const parentInvalid = (message: string) =>
  new HttpError(400, 'PRODUCT_CATEGORY_PARENT_INVALID', message);

const auditBase = (req: AuthRequest, connection: PoolConnection, scope: AdminScope) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  idMasterComp: scope.idMasterComp,
  category: 'data_change' as const,
  module: 'product_category',
  actorType: 'admin' as const,
  actorId: scope.idAdminAcct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'product_category',
});

/** Live categories under `parentId` (null: the top level), numbered 1..n. */
const siblingGroup = (idMasterComp: number, parentId: number | null): SortGroup => ({
  table: 'product_category',
  id: 'id_product_category',
  column: 'product_category_sort_order',
  where:
    'id_master_comp = ? AND product_category_deleted_at IS NULL AND id_parent_product_category <=> ?',
  params: [idMasterComp, parentId],
});

const parentOfRow = (row: RowDataPacket) => Number(row.id_parent_product_category) || null;

/** The live category (locked), or null. */
const lockCategory = async (connection: PoolConnection, id: number, idMasterComp: number) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT product_category_key, product_category_status, id_parent_product_category,
       product_category_sort_order
     FROM product_category
     WHERE id_product_category = ? AND id_master_comp = ? AND product_category_deleted_at IS NULL
     FOR UPDATE`,
    [id, idMasterComp],
  );
  return rows[0] ?? null;
};

/** Products (not deleted) that use the category. */
const countProducts = async (connection: PoolConnection, id: number, idMasterComp: number) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT pc.id_product) total
     FROM product_catalog_category pc
     JOIN product_catalog p ON p.id_product = pc.id_product AND p.product_deleted_at IS NULL
     WHERE pc.id_product_category = ? AND pc.id_master_comp = ?`,
    [id, idMasterComp],
  );
  return Number(rows[0]?.total ?? 0);
};

// Only a category without products can be switched off or deleted (owner decision, D-1).
const assertNoProducts = async (connection: PoolConnection, id: number, idMasterComp: number) => {
  const products = await countProducts(connection, id, idMasterComp);
  if (products > 0) {
    throw new HttpError(
      409,
      'PRODUCT_CATEGORY_HAS_PRODUCTS',
      'Move the products of this category to another category first',
      { products },
    );
  }
};

/** The parent must be a live category and, on update, not the category or one of its children. */
const assertParentAllowed = async (
  connection: PoolConnection,
  parentId: number,
  id: number | null,
  idMasterComp: number,
) => {
  const parentOf = async (categoryId: number) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id_parent_product_category FROM product_category
       WHERE id_product_category = ? AND id_master_comp = ? AND product_category_deleted_at IS NULL`,
      [categoryId, idMasterComp],
    );
    return rows;
  };
  if (!(await parentOf(parentId)).length) {
    throw parentInvalid('Selected parent category is unavailable');
  }
  if (!id) return;
  let ancestorId: number | null = parentId;
  const visited = new Set<number>();
  while (ancestorId && !visited.has(ancestorId)) {
    if (ancestorId === id) {
      throw parentInvalid('A category cannot be moved below one of its descendants');
    }
    visited.add(ancestorId);
    const rows = await parentOf(ancestorId);
    ancestorId = rows.length ? Number(rows[0].id_parent_product_category) || null : null;
  }
};

const saveTranslations = async (
  connection: PoolConnection,
  categoryId: number,
  idMasterComp: number,
  translations: CategoryPayload['translations'],
) => {
  // The slug index is unique, so the upsert below would otherwise overwrite another category's
  // translation instead of failing (BE-013).
  for (const item of translations) {
    const [taken] = await connection.query<RowDataPacket[]>(
      `SELECT id_product_category FROM product_category_i18n
       WHERE id_master_comp = ? AND product_category_locale = ? AND product_category_slug = ?
         AND id_product_category <> ?
       LIMIT 1`,
      [idMasterComp, item.locale, item.slug, categoryId],
    );
    if (taken.length) throw new HttpError(409, CONFLICT.code, CONFLICT.message);
  }
  for (const item of translations) {
    await connection.query(
      `INSERT INTO product_category_i18n (id_product_category, id_master_comp,
         product_category_locale, product_category_slug, product_category_name,
         product_category_description, product_category_meta_title,
         product_category_meta_description, product_category_canonical_url,
         product_category_og_title, product_category_og_description, product_category_i18n_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE product_category_slug = VALUES(product_category_slug),
         product_category_name = VALUES(product_category_name),
         product_category_description = VALUES(product_category_description),
         product_category_meta_title = VALUES(product_category_meta_title),
         product_category_meta_description = VALUES(product_category_meta_description),
         product_category_canonical_url = VALUES(product_category_canonical_url),
         product_category_og_title = VALUES(product_category_og_title),
         product_category_og_description = VALUES(product_category_og_description),
         product_category_i18n_status = VALUES(product_category_i18n_status)`,
      [
        categoryId,
        idMasterComp,
        item.locale,
        item.slug,
        item.name,
        item.description,
        item.metaTitle,
        item.metaDescription,
        item.canonicalUrl,
        item.ogTitle,
        item.ogDescription,
        item.status,
      ],
    );
  }
};

// Image, icon, and share image are replaced; any live attachment of the company can be used.
const saveMedia = async (
  connection: PoolConnection,
  categoryId: number,
  idMasterComp: number,
  media: CategoryPayload['media'],
) => {
  await connection.query(`DELETE FROM product_category_attachment WHERE id_product_category = ?`, [
    categoryId,
  ]);
  for (const role of MEDIA_ROLES) {
    const idAttachment = media[role];
    if (!idAttachment) continue;
    const [valid] = await connection.query<RowDataPacket[]>(
      `SELECT id_attachment FROM attachment
       WHERE id_attachment = ? AND id_master_comp = ? AND attachment_status = 1
         AND deleted_at IS NULL`,
      [idAttachment, idMasterComp],
    );
    if (!valid.length) {
      throw new HttpError(400, 'PRODUCT_CATEGORY_MEDIA_INVALID', 'Selected media is unavailable');
    }
    await connection.query(
      `INSERT INTO product_category_attachment (id_product_category, id_master_comp, id_attachment,
         product_category_attachment_role)
       VALUES (?, ?, ?, ?)`,
      [categoryId, idMasterComp, idAttachment, role],
    );
  }
};

/** Creates (`id` null) or updates a category with its translations and media. */
const save = async (req: AuthRequest, res: Response, id: number | null) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const payload = payloadOf(req.body);
  if (!payload) {
    return sendError(
      res,
      400,
      'PRODUCT_CATEGORY_PAYLOAD_INVALID',
      'Complete valid Indonesian and English category content',
    );
  }
  if (id && payload.parentId === id) {
    return sendError(
      res,
      400,
      'PRODUCT_CATEGORY_PARENT_INVALID',
      'A category cannot be its own parent',
    );
  }

  const categoryId = await withTransaction(pool, async (connection) => {
    if (payload.parentId) {
      await assertParentAllowed(connection, payload.parentId, id, scope.idMasterComp);
    }
    let savedId: number;
    if (id) {
      const current = await lockCategory(connection, id, scope.idMasterComp);
      if (!current) {
        throw new HttpError(404, 'PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found');
      }
      if (current.product_category_status === 'published' && payload.status !== 'published') {
        await assertNoProducts(connection, id, scope.idMasterComp);
      }
      // Same parent: the category keeps its place. New parent: it goes last there.
      const oldParent = parentOfRow(current);
      const moved = oldParent !== payload.parentId;
      const sortOrder = moved
        ? await nextPosition(connection, siblingGroup(scope.idMasterComp, payload.parentId))
        : Number(current.product_category_sort_order);
      await connection.query(
        `UPDATE product_category SET id_parent_product_category = ?, product_category_key = ?,
           product_category_status = ?, product_category_is_featured = ?,
           product_category_sort_order = ?, id_updated_by = ?
         WHERE id_product_category = ?`,
        [
          payload.parentId,
          payload.key,
          payload.status,
          payload.isFeatured,
          sortOrder,
          scope.idAdminAcct,
          id,
        ],
      );
      if (moved) await renumber(connection, siblingGroup(scope.idMasterComp, oldParent));
      savedId = id;
    } else {
      const sortOrder = await nextPosition(
        connection,
        siblingGroup(scope.idMasterComp, payload.parentId),
      );
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO product_category (id_master_comp, id_parent_product_category,
           product_category_key, product_category_status, product_category_is_featured,
           product_category_sort_order, id_created_by, id_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          payload.parentId,
          payload.key,
          payload.status,
          payload.isFeatured,
          sortOrder,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      savedId = insert.insertId;
    }
    await saveTranslations(connection, savedId, scope.idMasterComp, payload.translations);
    await saveMedia(connection, savedId, scope.idMasterComp, payload.media);
    await writeAuditLog({
      ...auditBase(req, connection, scope),
      eventCode: id ? 'product_category.updated' : 'product_category.created',
      action: id ? 'update' : 'create',
      entityId: savedId,
      entityLabel: payload.key,
      after: payload,
      httpStatus: id ? 200 : 201,
    });
    return savedId;
  });

  return sendSuccess(
    res,
    id ? 200 : 201,
    id ? 'PRODUCT_CATEGORY_UPDATED' : 'PRODUCT_CATEGORY_CREATED',
    id ? 'Product category updated' : 'Product category created',
    { id: keyhsid.idProductCategory.encode(categoryId) },
  );
};

router.get(
  '/api/v1/product-categories',
  verifyToken,
  requirePermission('product_category.view'),
  onFailure('PRODUCT_CATEGORY_LIST_FAILED', 'Unable to load product categories'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const locale = isPublicContentLocale(req.query.locale) ? String(req.query.locale) : 'id-ID';
    const search = trimTo(req.query.search, 200);
    const like = `%${search}%`;

    const [rows] = await pool.query<RowDataPacket[]>(
      `${LIST_SELECT}
       WHERE c.id_master_comp = ? AND c.product_category_deleted_at IS NULL
         AND (? = '' OR c.product_category_key LIKE ? OR i.product_category_name LIKE ?)
       ORDER BY c.product_category_sort_order, i.product_category_name`,
      [locale, scope.idMasterComp, search, like, like],
    );
    const data = rows.map(listDto);
    return sendSuccess(res, 200, 'PRODUCT_CATEGORIES_LISTED', 'Product categories loaded', {
      data: makeTree(data),
      total: data.length,
      total_all: await countOf(
        pool,
        `SELECT COUNT(*) AS total FROM product_category
         WHERE id_master_comp = ? AND product_category_deleted_at IS NULL`,
        [scope.idMasterComp],
      ),
    });
  },
);

router.patch(
  '/api/v1/product-categories/reorder',
  verifyToken,
  requirePermission('product_category.update'),
  onFailure('PRODUCT_CATEGORY_REORDER_FAILED', 'Unable to reorder product categories'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const orderInvalid = () =>
      sendError(res, 400, 'PRODUCT_CATEGORY_ORDER_INVALID', 'Category order is invalid');
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!rawItems.length || rawItems.length > 500) return orderInvalid();
    // The items are one level in the order given by sort_order (ties keep the list order);
    // they are saved as positions 1..n.
    const items = rawItems
      .map((item: any, index: number) => ({
        id: decodeId(item?.id, keyhsid.idProductCategory),
        sortOrder: Math.max(0, Math.floor(Number(item?.sort_order) || 0)),
        index,
      }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder || a.index - b.index)
      .map((item: any, index: number) => ({ id: item.id, sortOrder: index + 1 }));
    if (items.some((item: any) => !item.id)) return orderInvalid();
    if (new Set(items.map((item: any) => item.id)).size !== items.length) {
      return sendError(
        res,
        400,
        'PRODUCT_CATEGORY_ORDER_DUPLICATE',
        'Category order contains duplicate items',
      );
    }

    await withTransaction(pool, async (connection) => {
      const [existing] = await connection.query<RowDataPacket[]>(
        `SELECT id_product_category FROM product_category
         WHERE id_master_comp = ? AND product_category_deleted_at IS NULL
           AND id_product_category IN (${items.map(() => '?').join(',')})
         FOR UPDATE`,
        [scope.idMasterComp, ...items.map((item: any) => item.id)],
      );
      if (existing.length !== items.length) {
        throw new HttpError(
          404,
          'PRODUCT_CATEGORY_NOT_FOUND',
          'One or more categories were not found',
        );
      }
      await writeOrder(
        connection,
        siblingGroup(scope.idMasterComp, null),
        items.map((item: any) => item.id),
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope),
        eventCode: 'product_category.reordered',
        action: 'reorder',
        after: items,
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'PRODUCT_CATEGORY_REORDERED', 'Urutan kategori disimpan', null);
  },
);

router.get(
  '/api/v1/product-categories/:id',
  verifyToken,
  requirePermission('product_category.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idProductCategory);
    if (!id) return categoryNotFound(res);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_parent_product_category, product_category_key, product_category_status,
         product_category_is_featured, product_category_sort_order
       FROM product_category
       WHERE id_product_category = ? AND id_master_comp = ? AND product_category_deleted_at IS NULL`,
      [id, scope.idMasterComp],
    );
    if (!rows.length) return categoryNotFound(res);
    const [[place]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
         SUM(product_category_sort_order < ?
           OR (product_category_sort_order = ? AND id_product_category <= ?)) AS position
       FROM product_category
       WHERE id_master_comp = ? AND product_category_deleted_at IS NULL
         AND id_parent_product_category <=> ?`,
      [
        rows[0].product_category_sort_order,
        rows[0].product_category_sort_order,
        id,
        scope.idMasterComp,
        rows[0].id_parent_product_category,
      ],
    );
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_category_i18n WHERE id_product_category = ?
       ORDER BY product_category_locale`,
      [id],
    );
    const [media] = await pool.query<RowDataPacket[]>(
      `SELECT ca.product_category_attachment_role, a.id_attachment, a.storage_path, a.name,
         a.width, a.height, a.mime_type
       FROM product_category_attachment ca
       JOIN attachment a ON a.id_attachment = ca.id_attachment
       WHERE ca.id_product_category = ? AND ca.product_category_attachment_sort_order = 0`,
      [id],
    );
    const byRole = new Map(media.map((item) => [item.product_category_attachment_role, item]));
    const row = rows[0];

    return sendSuccess(res, 200, 'PRODUCT_CATEGORY_FOUND', 'Product category loaded', {
      id: req.params.id,
      parent_id: row.id_parent_product_category
        ? keyhsid.idProductCategory.encode(Number(row.id_parent_product_category))
        : null,
      key: row.product_category_key,
      type: 'product',
      status: row.product_category_status,
      is_featured: Boolean(row.product_category_is_featured),
      sort_order: Number(row.product_category_sort_order),
      position: Number(place.position),
      position_total: Number(place.total),
      category_image: mediaDto(byRole.get('image')),
      category_icon: mediaDto(byRole.get('icon')),
      category_meta_image: mediaDto(byRole.get('og')),
      translations: translations.map((item) => ({
        locale: item.product_category_locale,
        slug: item.product_category_slug,
        name: item.product_category_name,
        description: item.product_category_description ?? '',
        meta_title: item.product_category_meta_title ?? '',
        meta_description: item.product_category_meta_description ?? '',
        canonical_url: item.product_category_canonical_url ?? '',
        og_title: item.product_category_og_title ?? '',
        og_description: item.product_category_og_description ?? '',
        status: Number(item.product_category_i18n_status),
      })),
    });
  },
);

router.post(
  '/api/v1/product-categories',
  verifyToken,
  requirePermission('product_category.create'),
  onFailure('PRODUCT_CATEGORY_SAVE_FAILED', 'Unable to save product category', {
    duplicate: CONFLICT,
  }),
  (req: AuthRequest, res: Response) => save(req, res, null),
);

router.put(
  '/api/v1/product-categories/:id',
  verifyToken,
  requirePermission('product_category.update'),
  onFailure('PRODUCT_CATEGORY_SAVE_FAILED', 'Unable to save product category', {
    duplicate: CONFLICT,
  }),
  (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idProductCategory);
    return id ? save(req, res, id) : categoryNotFound(res);
  },
);

// Soft delete; a category with live child categories or products cannot be deleted.
router.delete(
  '/api/v1/product-categories/:id',
  verifyToken,
  requirePermission('product_category.delete'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idProductCategory);
    if (!id) return categoryNotFound(res);
    const [children] = await pool.query<RowDataPacket[]>(
      `SELECT id_product_category FROM product_category
       WHERE id_parent_product_category = ? AND id_master_comp = ?
         AND product_category_deleted_at IS NULL
       LIMIT 1`,
      [id, scope.idMasterComp],
    );
    if (children.length) {
      return sendError(
        res,
        409,
        'PRODUCT_CATEGORY_HAS_CHILDREN',
        'Move or delete child categories first',
      );
    }

    const found = await withTransaction(pool, async (connection) => {
      const category = await lockCategory(connection, id, scope.idMasterComp);
      if (!category) return false;
      await assertNoProducts(connection, id, scope.idMasterComp);
      // Release its media, so the files can be deleted from the media library.
      await connection.query(
        `DELETE FROM product_category_attachment WHERE id_product_category = ?`,
        [id],
      );
      await connection.query(
        `UPDATE product_category SET product_category_deleted_at = NOW(), id_updated_by = ?
         WHERE id_product_category = ? AND id_master_comp = ?`,
        [scope.idAdminAcct, id, scope.idMasterComp],
      );
      await renumber(connection, siblingGroup(scope.idMasterComp, parentOfRow(category)));
      await writeAuditLog({
        ...auditBase(req, connection, scope),
        eventCode: 'product_category.deleted',
        action: 'delete',
        entityId: id,
        entityLabel: category.product_category_key,
        before: { status: category.product_category_status },
        after: { deleted: true },
        httpStatus: 200,
      });
      return true;
    });
    if (!found) return categoryNotFound(res);
    return sendSuccess(
      res,
      200,
      'PRODUCT_CATEGORY_DELETED',
      'Product category moved to trash',
      null,
    );
  },
);

export default router;
