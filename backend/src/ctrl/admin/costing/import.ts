// The workbook of production and marketing: a report first, saved only when asked for again.
// The file is read from memory and not kept: its costs live only in the tables it fills.
import express = require('express');
import { Response } from 'express';
import multer from 'multer';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import {
  ParsedItem,
  parseCostingWorkbook,
  WorkbookError,
} from '../../../helper/costing-import.helper';
import { loadSetting } from '../../../helper/costing.helper';
import { priceLadder, roundTo } from '../../../helper/pricing.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { addRecipeVersion, auditCosting, RecipeLineInput } from './items';

const router = express.Router();
const { pool } = db;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const uploadWorkbook = (req: AuthRequest, res: Response, next: express.NextFunction): void => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error)
      sendError(res, 400, 'COSTING_IMPORT_FILE', 'The file could not be read (8 MB at most)');
    else next();
  });
};

/** One name per material: a label with several prices in the workbook gets its price added. */
const materialNames = (items: ParsedItem[]) => {
  const prices = new Map<string, Set<number>>();
  for (const item of items) {
    for (const line of item.lines) {
      const known = prices.get(line.label) ?? new Set<number>();
      known.add(line.price);
      prices.set(line.label, known);
    }
  }
  return (label: string, price: number) =>
    (prices.get(label)?.size ?? 0) > 1
      ? `${label} @${Math.round(price * 100) / 100}`.slice(0, 150)
      : label.slice(0, 150);
};

const liveAndKnown = async (idMasterComp: number, items: ParsedItem[]) => {
  const skus = items.flatMap((item) => (item.sku ? [item.sku] : []));
  const [products] = skus.length
    ? await pool.query<RowDataPacket[]>(
        `SELECT p.id_product, p.product_sku, p.product_status,
           (SELECT a.product_price_amount FROM product_catalog_price a
            WHERE a.id_product = p.id_product AND a.product_price_type = 'end_user'
              AND a.product_price_currency = 'IDR' AND a.product_price_is_active = 1 LIMIT 1) AS live
         FROM product_catalog p
         WHERE p.id_master_comp = ? AND p.product_sku IN (?) AND p.product_deleted_at IS NULL`,
        [idMasterComp, skus],
      )
    : [[] as RowDataPacket[]];
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT cost_item_key FROM cost_item WHERE id_master_comp = ? AND cost_item_deleted_at IS NULL',
    [idMasterComp],
  );
  return {
    products: new Map(products.map((row) => [row.product_sku as string, row])),
    existing: new Set(existing.map((row) => row.cost_item_key as string)),
  };
};

const saveItem = async (
  connection: PoolConnection,
  scope: AdminScope,
  item: ParsedItem,
  sortOrder: number,
  idProduct: number | null,
  materialOf: (label: string, price: number) => Promise<number>,
) => {
  await connection.query(
    `INSERT INTO cost_item
       (id_master_comp, id_product, cost_item_key, cost_item_name, cost_item_group,
        cost_item_width_cm, cost_item_length_cm, cost_item_height_cm,
        cost_item_gpm, cost_item_affiliate, cost_item_app, cost_item_sort_order, id_created_by, id_updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id_cost_item = LAST_INSERT_ID(id_cost_item),
       id_product = VALUES(id_product), cost_item_name = VALUES(cost_item_name),
       cost_item_group = VALUES(cost_item_group), cost_item_width_cm = VALUES(cost_item_width_cm),
       cost_item_length_cm = VALUES(cost_item_length_cm), cost_item_height_cm = VALUES(cost_item_height_cm),
       cost_item_gpm = VALUES(cost_item_gpm), cost_item_affiliate = VALUES(cost_item_affiliate),
       cost_item_app = VALUES(cost_item_app), cost_item_sort_order = VALUES(cost_item_sort_order),
       id_updated_by = VALUES(id_updated_by), cost_item_deleted_at = NULL`,
    [
      scope.idMasterComp,
      idProduct,
      item.key,
      item.name.slice(0, 255),
      item.group.slice(0, 150),
      item.width,
      item.length,
      item.height,
      item.gpm,
      item.affiliate,
      item.app,
      sortOrder,
      scope.idAdminAcct,
      scope.idAdminAcct,
    ],
  );
  const [ids] = await connection.query<RowDataPacket[]>('SELECT LAST_INSERT_ID() AS id');
  const idItem = Number(ids[0].id);

  const lines: RecipeLineInput[] = [];
  for (const line of item.lines) {
    lines.push({
      material: await materialOf(line.label, line.price),
      label: line.label.slice(0, 150),
      qty: Math.round(line.qty * 1e12) / 1e12,
      formula: null,
      ownPrice: line.unitPrice,
    });
  }
  // The same recipe again adds no version.
  const [current] = await connection.query<RowDataPacket[]>(
    `SELECT l.id_cost_material AS material, l.cost_recipe_line_label AS label,
       l.cost_recipe_line_qty AS qty, l.cost_recipe_line_unit_price AS own
     FROM cost_recipe_line l
     WHERE l.id_cost_recipe = (SELECT MAX(r.id_cost_recipe) FROM cost_recipe r WHERE r.id_cost_item = ?)
     ORDER BY l.cost_recipe_line_sort_order, l.id_cost_recipe_line`,
    [idItem],
  );
  const sameLine = (row: RowDataPacket, index: number) => {
    const line = lines[index];
    const own = row.own == null ? null : Number(row.own);
    return (
      row.material === line.material &&
      row.label === line.label &&
      Math.abs(Number(row.qty) - line.qty) < 1e-9 &&
      (own === line.ownPrice ||
        (own != null && line.ownPrice != null && Math.abs(own - line.ownPrice) < 1e-4))
    );
  };
  const unchanged = current.length === lines.length && current.every(sameLine);
  if (!unchanged) await addRecipeVersion(connection, scope, idItem, lines, 'Impor Excel');
  return { idItem, newRecipe: !unchanged };
};

router.post(
  '/api/v1/costing/import',
  verifyToken,
  requirePermission('cost.manage'),
  uploadWorkbook,
  onFailure('COSTING_IMPORT_FAILED', 'Unable to import the workbook'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    if (!req.file) return sendError(res, 400, 'COSTING_IMPORT_FILE', 'Choose the Excel file');

    let parsed;
    try {
      parsed = await parseCostingWorkbook(req.file.buffer);
    } catch (error) {
      if (error instanceof WorkbookError) {
        return sendError(res, 400, 'COSTING_IMPORT_UNREADABLE', error.message);
      }
      throw error;
    }
    const { items, issues } = parsed;
    const setting = await loadSetting(pool, scope.idMasterComp);
    const { products, existing } = await liveAndKnown(scope.idMasterComp, items);
    const nameOf = materialNames(items);

    const priceChanges = items.flatMap((item) => {
      const product = item.sku ? products.get(item.sku) : undefined;
      if (!product) return [];
      const next = roundTo(priceLadder(item.hpp, item).commerce, setting.roundIdr);
      const live = product.live == null ? null : Number(product.live);
      if (live != null && Math.abs(live - next) <= 1) return [];
      return [
        { sku: item.sku, name: item.name, status: product.product_status, live, excel: next },
      ];
    });
    const summary = {
      items: items.length,
      with_product: items.filter((item) => item.sku && products.has(item.sku)).length,
      without_product: items.filter((item) => !item.sku).map((item) => item.name),
      unknown_skus: items.flatMap((item) =>
        item.sku && !products.has(item.sku) ? [item.sku] : [],
      ),
      new_items: items.filter((item) => !existing.has(item.key)).length,
      updated_items: items.filter((item) => existing.has(item.key)).length,
      materials: new Set(items.flatMap((item) => item.lines.map((l) => nameOf(l.label, l.price))))
        .size,
      price_changes: priceChanges,
    };

    if (String(req.body?.apply ?? '') !== '1') {
      return sendSuccess(res, 200, 'COSTING_IMPORT_REPORT', 'Workbook read, nothing saved', {
        summary,
        issues,
        saved: false,
      });
    }

    const saved = await withTransaction(pool, async (connection) => {
      const materials = new Map<string, number>();
      const today = new Date();
      const date = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      const materialOf = async (label: string, price: number) => {
        const name = nameOf(label, price);
        const known = materials.get(name);
        if (known) return known;
        const kind = items
          .flatMap((item) => item.lines)
          .find((line) => line.label === label && line.price === price);
        const [created] = await connection.query(
          `INSERT INTO cost_material
             (id_master_comp, cost_material_name, cost_material_kind, cost_material_unit, id_created_by, id_updated_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE id_cost_material = LAST_INSERT_ID(id_cost_material), cost_material_deleted_at = NULL`,
          [
            scope.idMasterComp,
            name,
            kind?.kind ?? 'material',
            kind?.unit ?? 'pcs',
            scope.idAdminAcct,
            scope.idAdminAcct,
          ],
        );
        const id = (created as { insertId: number }).insertId;
        const [latest] = await connection.query<RowDataPacket[]>(
          `SELECT cost_material_price_amount AS amount FROM cost_material_price
           WHERE id_cost_material = ? ORDER BY cost_material_price_from DESC LIMIT 1`,
          [id],
        );
        if (!latest.length || Math.abs(Number(latest[0].amount) - price) >= 1e-6) {
          await connection.query(
            `INSERT INTO cost_material_price
               (id_cost_material, id_master_comp, cost_material_price_amount, cost_material_price_from,
                cost_material_price_note, id_created_by)
             VALUES (?, ?, ?, ?, 'Impor Excel', ?)
             ON DUPLICATE KEY UPDATE cost_material_price_amount = VALUES(cost_material_price_amount)`,
            [id, scope.idMasterComp, Math.round(price * 1e10) / 1e10, date, scope.idAdminAcct],
          );
        }
        materials.set(name, id);
        return id;
      };
      let recipes = 0;
      for (const [index, item] of items.entries()) {
        const product = item.sku ? products.get(item.sku) : undefined;
        const { newRecipe } = await saveItem(
          connection,
          scope,
          item,
          index,
          product?.id_product ?? null,
          materialOf,
        );
        if (newRecipe) recipes += 1;
      }
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.workbook_imported',
        action: 'import',
        entityType: 'cost_item',
        entityId: scope.idMasterComp,
        entityLabel: req.file?.originalname?.slice(0, 150) ?? 'Excel',
        after: { items: items.length, recipes, materials: materials.size },
      });
      return { recipes, materials: materials.size };
    });

    return sendSuccess(res, 200, 'COSTING_IMPORT_SAVED', 'Workbook saved', {
      summary,
      issues,
      saved: true,
      recipes: saved.recipes,
    });
  },
);

export default router;
