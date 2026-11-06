// HPP items, their recipes, the general rates, the calculator, and copying prices to the website.
import express = require('express');
import { Response } from 'express';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope, AdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import {
  channelRules,
  costItemDto,
  loadCostItems,
  loadSetting,
} from '../../../helper/costing.helper';
import { decodeId } from '../../../helper/id.helper';
import { trimTo } from '../../../helper/input.helper';
import { channelScenario, evaluateFormula, minimumPrice } from '../../../helper/pricing.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

export interface RecipeLineInput {
  material: number | null;
  label: string;
  qty: number;
  formula: string | null;
  ownPrice: number | null;
}

const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

export const auditCosting = (
  req: AuthRequest,
  connection: PoolConnection,
  scope: AdminScope,
  entry: {
    eventCode: string;
    action: string;
    entityType: string;
    entityId: number;
    entityLabel: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
) =>
  writeAuditLog({
    req,
    connection,
    writeMode: 'strict',
    idMasterComp: scope.idMasterComp,
    category: 'data_change',
    module: 'costing',
    actorType: 'admin',
    actorId: scope.idAdminAcct,
    actorLabel: req.user?.alias ?? null,
    httpStatus: 200,
    ...entry,
  });

/** A rate as a fraction: null for "use the general rate", undefined when it makes no sense. */
const rateOrNull = (value: unknown): number | null | undefined => {
  if (value === null || value === '' || value === undefined) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate < 0.95 ? rate : undefined;
};
const sizeOrNull = (value: unknown): number | null | undefined => {
  if (value === null || value === '' || value === undefined) return null;
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 && size <= 100000 ? size : undefined;
};

//==================================================
//==== ITEMS
//==================================================

router.get(
  '/api/v1/costing/items',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_LIST_FAILED', 'Unable to load HPP items'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const items = await loadCostItems(pool, scope.idMasterComp);
    const data = items.map((item) => costItemDto(item));
    return sendList(res, 'COSTING_ITEMS_FOUND', 'HPP items loaded', data, { total: data.length });
  },
);

router.get(
  '/api/v1/costing/items/by-product/:id',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_ITEM_FAILED', 'Unable to load the HPP item'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const idProduct = decodeId(req.params.id, keyhsid.idProduct);
    const [item] = idProduct ? await loadCostItems(pool, scope.idMasterComp, { idProduct }) : [];
    return sendSuccess(
      res,
      200,
      'COSTING_ITEM_FOUND',
      'HPP item loaded',
      item ? costItemDto(item, true) : null,
    );
  },
);

router.get(
  '/api/v1/costing/items/:id',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_ITEM_FAILED', 'Unable to load the HPP item'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const idItem = decodeId(req.params.id, keyhsid.idCostItem);
    const [item] = idItem ? await loadCostItems(pool, scope.idMasterComp, { idItem }) : [];
    if (!item) return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    return sendSuccess(res, 200, 'COSTING_ITEM_FOUND', 'HPP item loaded', costItemDto(item, true));
  },
);

/** The fields of an item from the request; null when something makes no sense. */
const readItem = (body: AuthRequest['body']) => {
  const name = trimTo(body?.name, 255);
  const rates = [body?.gpm, body?.affiliate, body?.app].map(rateOrNull);
  const sizes = [body?.width, body?.length, body?.height].map(sizeOrNull);
  if (!name || rates.includes(undefined) || sizes.includes(undefined)) return null;
  return {
    name,
    group: trimTo(body?.group, 150) || null,
    gpm: rates[0] as number | null,
    affiliate: rates[1] as number | null,
    app: rates[2] as number | null,
    width: sizes[0] as number | null,
    length: sizes[1] as number | null,
    height: sizes[2] as number | null,
  };
};

/** The catalog product a SKU names; undefined when the SKU is given but unknown. */
const productOfSku = async (
  connection: PoolConnection,
  idMasterComp: number,
  value: unknown,
): Promise<number | null | undefined> => {
  const sku = trimTo(value, 120);
  if (!sku) return null;
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id_product FROM product_catalog
     WHERE id_master_comp = ? AND product_sku = ? AND product_deleted_at IS NULL`,
    [idMasterComp, sku],
  );
  return rows[0]?.id_product;
};

const itemColumns = (item: NonNullable<ReturnType<typeof readItem>>) => [
  item.name,
  item.group,
  item.width,
  item.length,
  item.height,
  item.gpm,
  item.affiliate,
  item.app,
];

router.post(
  '/api/v1/costing/items',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_ITEM_SAVE_FAILED', 'Unable to save the HPP item', {
    duplicate: { code: 'COSTING_ITEM_DUPLICATE', message: 'This product already has an HPP item' },
  }),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const item = readItem(req.body);
    if (!item)
      return sendError(res, 400, 'COSTING_ITEM_INVALID', 'Check the name, rates, and size');
    const id = await withTransaction(pool, async (connection) => {
      const idProduct = await productOfSku(connection, scope.idMasterComp, req.body?.sku);
      if (idProduct === undefined) return null;
      const [result] = await connection.query(
        `INSERT INTO cost_item
           (id_master_comp, id_product, cost_item_key, cost_item_name, cost_item_group,
            cost_item_width_cm, cost_item_length_cm, cost_item_height_cm,
            cost_item_gpm, cost_item_affiliate, cost_item_app, id_created_by, id_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          idProduct,
          trimTo(req.body?.sku, 120) || `manual-${Date.now()}`,
          ...itemColumns(item),
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      const created = (result as { insertId: number }).insertId;
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.item_created',
        action: 'create',
        entityType: 'cost_item',
        entityId: created,
        entityLabel: item.name,
        after: item,
      });
      return created;
    });
    if (!id) return sendError(res, 400, 'COSTING_SKU_UNKNOWN', 'No product has this SKU');
    return sendSuccess(res, 201, 'COSTING_ITEM_CREATED', 'HPP item saved', {
      id: keyhsid.idCostItem.encode(id),
    });
  },
);

router.put(
  '/api/v1/costing/items/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_ITEM_SAVE_FAILED', 'Unable to save the HPP item', {
    duplicate: { code: 'COSTING_ITEM_DUPLICATE', message: 'This product already has an HPP item' },
  }),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostItem);
    const item = readItem(req.body);
    if (!id) return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    if (!item)
      return sendError(res, 400, 'COSTING_ITEM_INVALID', 'Check the name, rates, and size');
    const outcome = await withTransaction(pool, async (connection) => {
      const idProduct = await productOfSku(connection, scope.idMasterComp, req.body?.sku);
      if (idProduct === undefined) return 'sku';
      const [result] = await connection.query(
        `UPDATE cost_item SET id_product = ?, cost_item_name = ?, cost_item_group = ?,
           cost_item_width_cm = ?, cost_item_length_cm = ?, cost_item_height_cm = ?,
           cost_item_gpm = ?, cost_item_affiliate = ?, cost_item_app = ?, id_updated_by = ?
         WHERE id_cost_item = ? AND id_master_comp = ? AND cost_item_deleted_at IS NULL`,
        [idProduct, ...itemColumns(item), scope.idAdminAcct, id, scope.idMasterComp],
      );
      if (!(result as { affectedRows: number }).affectedRows) return 'missing';
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.item_updated',
        action: 'update',
        entityType: 'cost_item',
        entityId: id,
        entityLabel: item.name,
        after: item,
      });
      return 'ok';
    });
    if (outcome === 'sku')
      return sendError(res, 400, 'COSTING_SKU_UNKNOWN', 'No product has this SKU');
    if (outcome === 'missing')
      return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    return sendSuccess(res, 200, 'COSTING_ITEM_UPDATED', 'HPP item saved');
  },
);

//==================================================
//==== RECIPE
//==================================================

/** Saving adds a version, so what an item was made of stays on record. */
router.put(
  '/api/v1/costing/items/:id/recipe',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_RECIPE_SAVE_FAILED', 'Unable to save the recipe'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostItem);
    if (!id) return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : null;
    if (!lines || lines.length > 100) {
      return sendError(res, 400, 'COSTING_RECIPE_INVALID', 'Check the recipe lines');
    }
    const parsed: RecipeLineInput[] = [];
    for (const line of lines) {
      const material = line?.material_id
        ? decodeId(line.material_id, keyhsid.idCostMaterial)
        : null;
      const label = trimTo(line?.label, 150);
      const qty = Number(line?.qty ?? 1);
      const formula = trimTo(line?.formula, 255) || null;
      const ownPrice =
        line?.own_price === '' || line?.own_price == null ? null : Number(line.own_price);
      const priceOk = ownPrice == null || (Number.isFinite(ownPrice) && ownPrice >= 0);
      if (
        !label ||
        (line?.material_id && !material) ||
        (!material && ownPrice == null) ||
        !Number.isFinite(qty) ||
        qty < 0 ||
        !priceOk
      ) {
        return sendError(res, 400, 'COSTING_RECIPE_INVALID', 'Check the recipe lines');
      }
      if (formula) {
        try {
          evaluateFormula(formula, { L: 1, P: 1, T: 1 });
        } catch {
          return sendError(res, 400, 'COSTING_FORMULA_INVALID', 'Check the quantity formula');
        }
      }
      parsed.push({ material, label, qty, formula, ownPrice });
    }
    const version = await withTransaction(pool, async (connection) => {
      const [items] = await connection.query<RowDataPacket[]>(
        `SELECT cost_item_name FROM cost_item
         WHERE id_cost_item = ? AND id_master_comp = ? AND cost_item_deleted_at IS NULL FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!items.length) return null;
      const materials = parsed.map((line) => line.material).filter(Boolean);
      if (materials.length) {
        const [known] = await connection.query<RowDataPacket[]>(
          `SELECT id_cost_material FROM cost_material
           WHERE id_master_comp = ? AND id_cost_material IN (?) AND cost_material_deleted_at IS NULL`,
          [scope.idMasterComp, materials],
        );
        if (known.length !== new Set(materials).size) return 0;
      }
      const next = await addRecipeVersion(
        connection,
        scope,
        id,
        parsed,
        trimTo(req.body?.note, 255),
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.recipe_saved',
        action: 'update',
        entityType: 'cost_item',
        entityId: id,
        entityLabel: items[0].cost_item_name,
        after: { version: next, lines: parsed.length },
      });
      return next;
    });
    if (version === null)
      return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    if (version === 0)
      return sendError(res, 400, 'COSTING_RECIPE_INVALID', 'Check the recipe lines');
    return sendSuccess(res, 200, 'COSTING_RECIPE_SAVED', 'Recipe saved', { version });
  },
);

export const addRecipeVersion = async (
  connection: PoolConnection,
  scope: AdminScope,
  idItem: number,
  lines: RecipeLineInput[],
  note: string,
): Promise<number> => {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT COALESCE(MAX(cost_recipe_version), 0) + 1 AS next FROM cost_recipe WHERE id_cost_item = ?',
    [idItem],
  );
  const version = Number(rows[0].next);
  const [created] = await connection.query(
    `INSERT INTO cost_recipe
       (id_cost_item, id_master_comp, cost_recipe_version, cost_recipe_note, id_created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [idItem, scope.idMasterComp, version, note || null, scope.idAdminAcct],
  );
  const idRecipe = (created as { insertId: number }).insertId;
  if (lines.length) {
    await connection.query(
      `INSERT INTO cost_recipe_line
         (id_cost_recipe, id_cost_material, cost_recipe_line_label, cost_recipe_line_qty,
          cost_recipe_line_formula, cost_recipe_line_unit_price, cost_recipe_line_sort_order)
       VALUES ?`,
      [
        lines.map((line, index) => [
          idRecipe,
          line.material,
          line.label,
          line.qty,
          line.formula,
          line.ownPrice,
          index,
        ]),
      ],
    );
  }
  return version;
};

//==================================================
//==== GENERAL RATES
//==================================================

router.get(
  '/api/v1/costing/setting',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_SETTING_FAILED', 'Unable to load the rates'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const setting = await loadSetting(pool, scope.idMasterComp);
    return sendSuccess(res, 200, 'COSTING_SETTING_FOUND', 'Rates loaded', {
      gpm: setting.gpm,
      affiliate: setting.affiliate,
      app: setting.app,
      wholesale_discount: setting.wholesaleDiscount,
      usd_rate: setting.usdRate,
      round_idr: setting.roundIdr,
    });
  },
);

router.put(
  '/api/v1/costing/setting',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_SETTING_FAILED', 'Unable to save the rates'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const body = req.body ?? {};
    const rates = [body.gpm, body.affiliate, body.app, body.wholesale_discount].map(rateOrNull);
    const usdRate = Number(body.usd_rate);
    const roundIdr = Number(body.round_idr);
    if (
      rates.some((rate) => rate == null) ||
      !Number.isFinite(usdRate) ||
      usdRate <= 0 ||
      !Number.isFinite(roundIdr) ||
      roundIdr < 0
    ) {
      return sendError(res, 400, 'COSTING_SETTING_INVALID', 'Check the rates');
    }
    await withTransaction(pool, async (connection) => {
      await loadSetting(connection, scope.idMasterComp);
      await connection.query(
        `UPDATE pricing_setting SET pricing_gpm = ?, pricing_affiliate = ?, pricing_app = ?,
           pricing_wholesale_discount = ?, pricing_usd_rate = ?, pricing_round_idr = ?, id_updated_by = ?
         WHERE id_master_comp = ?`,
        [...rates, usdRate, roundIdr, scope.idAdminAcct, scope.idMasterComp],
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.setting_updated',
        action: 'update',
        entityType: 'pricing_setting',
        entityId: scope.idMasterComp,
        entityLabel: 'Tarif umum',
        after: { rates, usdRate, roundIdr },
      });
    });
    return sendSuccess(res, 200, 'COSTING_SETTING_UPDATED', 'Rates saved');
  },
);

//==================================================
//==== CALCULATOR
//==================================================

const amount = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

router.post(
  '/api/v1/costing/calculate',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_CALCULATE_FAILED', 'Unable to calculate'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const body = req.body ?? {};
    const idItem = body.item_id ? decodeId(body.item_id, keyhsid.idCostItem) : null;
    if (body.item_id && !idItem) {
      return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');
    }
    const [item] = idItem ? await loadCostItems(pool, scope.idMasterComp, { idItem }) : [];
    if (idItem && !item) return sendError(res, 404, 'COSTING_ITEM_NOT_FOUND', 'HPP item not found');

    const values = {
      hpp: amount(body.hpp ?? item?.hpp),
      price: amount(body.price ?? item?.commerce),
      qty: amount(body.qty ?? 1),
      discount: amount(body.discount),
      voucher: amount(body.voucher),
      adsRate: amount(body.ads_rate),
      shipping: amount(body.shipping),
      taxRate: amount(body.tax_rate),
    };
    const target = body.target_margin == null ? null : Number(body.target_margin);
    if (
      Object.values(values).some((value) => value == null) ||
      (values.adsRate ?? 0) >= 1 ||
      (values.taxRate ?? 0) >= 1 ||
      (target != null && (!Number.isFinite(target) || target < 0 || target >= 1))
    ) {
      return sendError(res, 400, 'COSTING_CALCULATE_INVALID', 'Check the numbers');
    }
    const scenario = values as { [key in keyof typeof values]: number };
    const channels = await channelRules(pool, scope.idMasterComp, item?.idCategory ?? null);
    return sendSuccess(res, 200, 'COSTING_CALCULATED', 'Calculated', {
      hpp: scenario.hpp,
      price: scenario.price,
      channels: channels.map((channel) => {
        const result = channelScenario(scenario, channel.rules);
        const { price: _price, ...rest } = scenario;
        return {
          id: keyhsid.idSalesChannel.encode(channel.id),
          name: channel.name,
          has_rules: channel.rules.length > 0,
          revenue: result.revenue,
          fees: result.fees,
          received: result.received,
          cost: result.cost,
          profit: result.profit,
          margin: result.margin,
          minimum_price: target == null ? null : minimumPrice(rest, channel.rules, target),
        };
      }),
    });
  },
);

//==================================================
//==== APPLY PRICES TO THE WEBSITE
//==================================================

const PRICE_ROWS = [
  { type: 'end_user', currency: 'IDR', label: 'Harga konsumen', isPublic: 1, of: 'commerce' },
  { type: 'end_user', currency: 'USD', label: 'Consumer price', isPublic: 1, of: 'usd' },
  { type: 'wholesale', currency: 'IDR', label: 'Harga grosir', isPublic: 0, of: 'wholesale' },
  { type: 'wholesale', currency: 'USD', label: 'Wholesale price', isPublic: 0, of: 'usdWholesale' },
] as const;

/** Nothing reaches the website unless someone asks for it, one list of items at a time. */
router.post(
  '/api/v1/costing/apply-prices',
  verifyToken,
  requirePermission('price.apply'),
  onFailure('COSTING_APPLY_FAILED', 'Unable to apply the prices'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const hashes = Array.isArray(req.body?.item_ids) ? req.body.item_ids : [];
    const ids = hashes.map((hash: unknown) => decodeId(hash, keyhsid.idCostItem));
    if (!ids.length || ids.length > 500 || ids.includes(null)) {
      return sendError(res, 400, 'COSTING_APPLY_INVALID', 'Choose the items to apply');
    }
    const wanted = new Set(ids as number[]);
    const applied = await withTransaction(pool, async (connection) => {
      const items = (await loadCostItems(connection, scope.idMasterComp)).filter(
        (item) => wanted.has(item.id) && item.idProduct && item.hpp > 0,
      );
      for (const item of items) {
        for (const row of PRICE_ROWS) {
          const value = item[row.of];
          const [existing] = await connection.query<RowDataPacket[]>(
            `SELECT id_product_price FROM product_catalog_price
             WHERE id_product = ? AND id_master_comp = ? AND product_price_type = ?
               AND product_price_currency = ?
             ORDER BY product_price_is_active DESC, id_product_price LIMIT 1`,
            [item.idProduct, scope.idMasterComp, row.type, row.currency],
          );
          if (existing.length) {
            await connection.query(
              'UPDATE product_catalog_price SET product_price_amount = ? WHERE id_product_price = ?',
              [value, existing[0].id_product_price],
            );
          } else {
            await connection.query(
              `INSERT INTO product_catalog_price
                 (id_product, id_master_comp, product_price_type, product_price_label,
                  product_price_currency, product_price_amount, product_price_is_public, product_price_is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                item.idProduct,
                scope.idMasterComp,
                row.type,
                row.label,
                row.currency,
                value,
                row.isPublic,
              ],
            );
          }
        }
        await auditCosting(req, connection, scope, {
          eventCode: 'costing.price_applied',
          action: 'update',
          entityType: 'product',
          entityId: Number(item.idProduct),
          entityLabel: item.sku ?? item.name,
          before: item.live,
          after: {
            idr: item.commerce,
            wholesale: item.wholesale,
            usd: item.usd,
            usd_wholesale: item.usdWholesale,
          },
        });
      }
      return items.length;
    });
    return sendSuccess(res, 200, 'COSTING_PRICES_APPLIED', 'Prices applied', { applied });
  },
);

export default router;
