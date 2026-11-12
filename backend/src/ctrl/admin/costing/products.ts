// HPP from the product's side: every product has one item, started on request, and an item
// without a product can become a draft product.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { resolveEntityId } from '../../../helper/business.helper';
import { costItemDto, loadCostItems } from '../../../helper/costing.helper';
import { decodeId } from '../../../helper/id.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { auditCosting } from './items';

const router = express.Router();
const { pool } = db;

const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

const initialsOf = (value: string) =>
  value
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 8) || 'PRD';

const slugOf = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Starts the HPP of a product: the item keeps its name and SKU. Asking twice changes nothing. */
router.post(
  '/api/v1/costing/products/:id/item',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_ITEM_SAVE_FAILED', 'Unable to start the HPP'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const idProduct = decodeId(req.params.id, keyhsid.idProduct);
    if (!idProduct) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const found = await withTransaction(pool, async (connection) => {
      const [products] = await connection.query<RowDataPacket[]>(
        `SELECT p.product_sku, n.product_name FROM product_catalog p
         LEFT JOIN product_catalog_i18n n
           ON n.id_product = p.id_product AND n.product_locale = 'id-ID'
         WHERE p.id_product = ? AND p.id_master_comp = ? AND p.product_deleted_at IS NULL`,
        [idProduct, scope.idMasterComp],
      );
      if (!products.length) return false;
      const product = products[0];
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT 1 FROM cost_item WHERE id_master_comp = ? AND id_product = ?',
        [scope.idMasterComp, idProduct],
      );
      if (existing.length) return true;
      const [created] = await connection.query(
        `INSERT INTO cost_item
           (id_master_comp, id_product, cost_item_key, cost_item_name, id_created_by, id_updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id_cost_item = LAST_INSERT_ID(id_cost_item),
           id_product = VALUES(id_product), cost_item_deleted_at = NULL`,
        [
          scope.idMasterComp,
          idProduct,
          product.product_sku,
          product.product_name ?? product.product_sku,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.item_created',
        action: 'create',
        entityType: 'cost_item',
        entityId: (created as { insertId: number }).insertId,
        entityLabel: product.product_sku,
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const [item] = await loadCostItems(pool, scope.idMasterComp, { idProduct });
    return sendSuccess(res, 200, 'COSTING_ITEM_FOUND', 'HPP started', costItemDto(item, true));
  },
);

/** Makes draft products of items that have none. Sizes come along; content comes later. */
router.post(
  '/api/v1/costing/create-products',
  verifyToken,
  requirePermission('cost.manage'),
  requirePermission('product.create'),
  onFailure('COSTING_CREATE_PRODUCTS_FAILED', 'Unable to create the products'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const ids = (Array.isArray(req.body?.item_ids) ? req.body.item_ids : []).map((hash: unknown) =>
      decodeId(hash, keyhsid.idCostItem),
    );
    const idCategory = decodeId(req.body?.category_id, keyhsid.idProductCategory);
    if (!ids.length || ids.length > 200 || ids.includes(null) || !idCategory) {
      return sendError(
        res,
        400,
        'COSTING_CREATE_PRODUCTS_INVALID',
        'Choose the items and a category',
      );
    }
    const created = await withTransaction(pool, async (connection) => {
      const [categories] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM product_category
         WHERE id_product_category = ? AND id_master_comp = ? AND product_category_deleted_at IS NULL`,
        [idCategory, scope.idMasterComp],
      );
      if (!categories.length) return null;
      const [items] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM cost_item
         WHERE id_master_comp = ? AND id_cost_item IN (?) AND id_product IS NULL
           AND cost_item_deleted_at IS NULL FOR UPDATE`,
        [scope.idMasterComp, ids],
      );
      let count = 0;
      for (const item of items) {
        const size = [item.cost_item_width_cm, item.cost_item_length_cm, item.cost_item_height_cm]
          .filter((value) => value != null)
          .map((value) => Number(value));
        const base = slugOf(`${item.cost_item_name} ${size.join('x')}`).slice(0, 100) || 'produk';
        const skuBase =
          `${initialsOf(item.cost_item_name)}${size.map((value) => String(value).replace('.', '')).join('')}`.slice(
            0,
            40,
          );
        let slug = base;
        let sku = skuBase;
        for (let suffix = 2; ; suffix += 1) {
          const [taken] = await connection.query<RowDataPacket[]>(
            `SELECT (SELECT COUNT(*) FROM product_catalog
                     WHERE id_master_comp = ? AND (product_key = ? OR product_sku = ?))
                  + (SELECT COUNT(*) FROM product_catalog_i18n
                     WHERE id_master_comp = ? AND product_slug = ?) AS total`,
            [scope.idMasterComp, slug, sku, scope.idMasterComp, slug],
          );
          if (!Number(taken[0].total)) break;
          slug = `${base}-${suffix}`;
          sku = `${skuBase}-${suffix}`;
        }
        const mm = (value: unknown) => (value == null ? null : Number(value) * 10);
        // A draft made here is sold and made by the account's own entity (the platform, usually).
        const idEntity = await resolveEntityId(connection, scope, undefined, 'seller_entity_id');
        const [product] = await connection.query(
          `INSERT INTO product_catalog
             (id_master_comp, id_seller_business_entity, id_producer_business_entity, product_key,
              product_sku, product_status, product_unit, product_length_mm, product_width_mm,
              product_height_mm, id_created_by, id_updated_by)
           VALUES (?, ?, ?, ?, ?, 'draft', 'pcs', ?, ?, ?, ?, ?)`,
          [
            scope.idMasterComp,
            idEntity,
            idEntity,
            slug,
            sku,
            mm(item.cost_item_length_cm),
            mm(item.cost_item_width_cm),
            mm(item.cost_item_height_cm),
            scope.idAdminAcct,
            scope.idAdminAcct,
          ],
        );
        const idProduct = (product as { insertId: number }).insertId;
        await connection.query(
          `INSERT INTO product_catalog_i18n
             (id_product, id_master_comp, product_locale, product_slug, product_name)
           VALUES ?`,
          [
            ['id-ID', 'en-US'].map((locale) => [
              idProduct,
              scope.idMasterComp,
              locale,
              slug,
              item.cost_item_name,
            ]),
          ],
        );
        await connection.query(
          `INSERT INTO product_catalog_category
             (id_product, id_product_category, id_master_comp, is_primary)
           VALUES (?, ?, ?, 1)`,
          [idProduct, idCategory, scope.idMasterComp],
        );
        await connection.query(
          'UPDATE cost_item SET id_product = ?, id_updated_by = ? WHERE id_cost_item = ?',
          [idProduct, scope.idAdminAcct, item.id_cost_item],
        );
        await auditCosting(req, connection, scope, {
          eventCode: 'costing.product_created',
          action: 'create',
          entityType: 'product',
          entityId: idProduct,
          entityLabel: sku,
        });
        count += 1;
      }
      return count;
    });
    if (created === null) {
      return sendError(
        res,
        400,
        'COSTING_CREATE_PRODUCTS_INVALID',
        'Choose the items and a category',
      );
    }
    return sendSuccess(res, 200, 'COSTING_PRODUCTS_CREATED', 'Draft products created', { created });
  },
);

export default router;
