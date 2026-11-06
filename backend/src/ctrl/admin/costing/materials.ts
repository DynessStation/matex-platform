// Materials with their dated prices, and sales channels with their dated charges.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import { ensureChannels, loadCostItems } from '../../../helper/costing.helper';
import { decodeId } from '../../../helper/id.helper';
import { trimTo } from '../../../helper/input.helper';
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

const KINDS = new Set(['material', 'service', 'packaging', 'shipping', 'other']);
const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));
const dateText = (value: unknown) =>
  value instanceof Date
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    : String(value ?? '').slice(0, 10);

const today = () => dateText(new Date());

//==================================================
//==== MATERIALS
//==================================================

router.get(
  '/api/v1/costing/materials',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_MATERIALS_FAILED', 'Unable to load materials'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*,
         (SELECT p.cost_material_price_amount FROM cost_material_price p
          WHERE p.id_cost_material = m.id_cost_material AND p.cost_material_price_from <= CURDATE()
          ORDER BY p.cost_material_price_from DESC LIMIT 1) AS price,
         (SELECT p.cost_material_price_from FROM cost_material_price p
          WHERE p.id_cost_material = m.id_cost_material AND p.cost_material_price_from <= CURDATE()
          ORDER BY p.cost_material_price_from DESC LIMIT 1) AS price_from,
         (SELECT COUNT(DISTINCT r.id_cost_item) FROM cost_recipe_line l
          JOIN cost_recipe r ON r.id_cost_recipe = l.id_cost_recipe
          WHERE l.id_cost_material = m.id_cost_material
            AND r.id_cost_recipe = (SELECT MAX(r2.id_cost_recipe) FROM cost_recipe r2 WHERE r2.id_cost_item = r.id_cost_item)
         ) AS used_by
       FROM cost_material m
       WHERE m.id_master_comp = ? AND m.cost_material_deleted_at IS NULL
       ORDER BY m.cost_material_kind, m.cost_material_name`,
      [scope.idMasterComp],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idCostMaterial.encode(row.id_cost_material),
      name: row.cost_material_name,
      kind: row.cost_material_kind,
      unit: row.cost_material_unit,
      note: row.cost_material_note,
      status: Boolean(row.cost_material_status),
      price: row.price == null ? null : Number(row.price),
      price_from: row.price_from ? dateText(row.price_from) : null,
      used_by: Number(row.used_by),
    }));
    return sendList(res, 'COSTING_MATERIALS_FOUND', 'Materials loaded', data, {
      total: data.length,
    });
  },
);

const readMaterial = (body: AuthRequest['body']) => {
  const name = trimTo(body?.name, 150);
  const kind = String(body?.kind ?? 'material');
  const unit = trimTo(body?.unit, 20);
  if (!name || !unit || !KINDS.has(kind)) return null;
  return { name, kind, unit, note: trimTo(body?.note, 255) || null };
};

const DUPLICATE_MATERIAL = {
  duplicate: { code: 'COSTING_MATERIAL_DUPLICATE', message: 'A material has this name' },
};

router.post(
  '/api/v1/costing/materials',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_MATERIAL_SAVE_FAILED', 'Unable to save the material', DUPLICATE_MATERIAL),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const material = readMaterial(req.body);
    const price = Number(req.body?.price);
    if (!material || !Number.isFinite(price) || price < 0) {
      return sendError(res, 400, 'COSTING_MATERIAL_INVALID', 'Check the name, unit, and price');
    }
    const id = await withTransaction(pool, async (connection) => {
      const [created] = await connection.query(
        `INSERT INTO cost_material
           (id_master_comp, cost_material_name, cost_material_kind, cost_material_unit,
            cost_material_note, id_created_by, id_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          material.name,
          material.kind,
          material.unit,
          material.note,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      const idMaterial = (created as { insertId: number }).insertId;
      await connection.query(
        `INSERT INTO cost_material_price
           (id_cost_material, id_master_comp, cost_material_price_amount, cost_material_price_from, id_created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [idMaterial, scope.idMasterComp, price, today(), scope.idAdminAcct],
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.material_created',
        action: 'create',
        entityType: 'cost_material',
        entityId: idMaterial,
        entityLabel: material.name,
        after: { ...material, price },
      });
      return idMaterial;
    });
    return sendSuccess(res, 201, 'COSTING_MATERIAL_CREATED', 'Material saved', {
      id: keyhsid.idCostMaterial.encode(id),
    });
  },
);

router.put(
  '/api/v1/costing/materials/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_MATERIAL_SAVE_FAILED', 'Unable to save the material', DUPLICATE_MATERIAL),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostMaterial);
    const material = readMaterial(req.body);
    if (!id) return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    if (!material)
      return sendError(res, 400, 'COSTING_MATERIAL_INVALID', 'Check the name and unit');
    const found = await withTransaction(pool, async (connection) => {
      const [result] = await connection.query(
        `UPDATE cost_material SET cost_material_name = ?, cost_material_kind = ?, cost_material_unit = ?,
           cost_material_note = ?, id_updated_by = ?
         WHERE id_cost_material = ? AND id_master_comp = ? AND cost_material_deleted_at IS NULL`,
        [
          material.name,
          material.kind,
          material.unit,
          material.note,
          scope.idAdminAcct,
          id,
          scope.idMasterComp,
        ],
      );
      if (!(result as { affectedRows: number }).affectedRows) return false;
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.material_updated',
        action: 'update',
        entityType: 'cost_material',
        entityId: id,
        entityLabel: material.name,
        after: material,
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    return sendSuccess(res, 200, 'COSTING_MATERIAL_UPDATED', 'Material saved');
  },
);

router.delete(
  '/api/v1/costing/materials/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_MATERIAL_DELETE_FAILED', 'Unable to delete the material'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostMaterial);
    if (!id) return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    const outcome = await withTransaction(pool, async (connection) => {
      const [materials] = await connection.query<RowDataPacket[]>(
        `SELECT cost_material_name FROM cost_material
         WHERE id_cost_material = ? AND id_master_comp = ? AND cost_material_deleted_at IS NULL FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!materials.length) return 'missing';
      const [used] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM cost_recipe_line l JOIN cost_recipe r ON r.id_cost_recipe = l.id_cost_recipe
         WHERE l.id_cost_material = ?
           AND r.id_cost_recipe = (SELECT MAX(r2.id_cost_recipe) FROM cost_recipe r2 WHERE r2.id_cost_item = r.id_cost_item)
         LIMIT 1`,
        [id],
      );
      if (used.length) return 'used';
      await connection.query(
        'UPDATE cost_material SET cost_material_deleted_at = NOW(), id_updated_by = ? WHERE id_cost_material = ?',
        [scope.idAdminAcct, id],
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.material_deleted',
        action: 'delete',
        entityType: 'cost_material',
        entityId: id,
        entityLabel: materials[0].cost_material_name,
      });
      return 'ok';
    });
    if (outcome === 'missing')
      return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    if (outcome === 'used') {
      return sendError(res, 409, 'COSTING_MATERIAL_IN_USE', 'A recipe still uses this material');
    }
    return sendSuccess(res, 200, 'COSTING_MATERIAL_DELETED', 'Material deleted');
  },
);

router.get(
  '/api/v1/costing/materials/:id/prices',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_MATERIALS_FAILED', 'Unable to load the prices'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostMaterial);
    const [rows] = id
      ? await pool.query<RowDataPacket[]>(
          `SELECT cost_material_price_amount, cost_material_price_from, cost_material_price_note
           FROM cost_material_price WHERE id_cost_material = ? AND id_master_comp = ?
           ORDER BY cost_material_price_from DESC`,
          [id, scope.idMasterComp],
        )
      : [[] as RowDataPacket[]];
    const data = rows.map((row) => ({
      amount: Number(row.cost_material_price_amount),
      from: dateText(row.cost_material_price_from),
      note: row.cost_material_price_note,
    }));
    return sendList(res, 'COSTING_PRICES_FOUND', 'Prices loaded', data, { total: data.length });
  },
);

/** What a new price would do to the HPP of each item using the material, before saving it. */
router.get(
  '/api/v1/costing/materials/:id/impact',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_MATERIALS_FAILED', 'Unable to work out the impact'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostMaterial);
    const price = Number(req.query.price);
    if (!id || !Number.isFinite(price) || price < 0) {
      return sendError(res, 400, 'COSTING_IMPACT_INVALID', 'Check the price');
    }
    const items = await loadCostItems(pool, scope.idMasterComp);
    const data = items
      .map((item) => {
        const change = item.lines
          .filter((line) => line.idMaterial === id && line.ownPrice == null)
          .reduce((sum, line) => sum + line.qty * (price - line.price), 0);
        return {
          id: keyhsid.idCostItem.encode(item.id),
          name: item.name,
          sku: item.sku,
          hpp: item.hpp,
          change,
        };
      })
      .filter((item) => item.change !== 0);
    return sendList(res, 'COSTING_IMPACT_FOUND', 'Impact worked out', data, { total: data.length });
  },
);

router.post(
  '/api/v1/costing/materials/:id/prices',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_PRICE_SAVE_FAILED', 'Unable to save the price'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idCostMaterial);
    const price = Number(req.body?.amount);
    const from = req.body?.from ?? today();
    if (!id) return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    if (!Number.isFinite(price) || price < 0 || !isDate(from)) {
      return sendError(res, 400, 'COSTING_PRICE_INVALID', 'Check the price and date');
    }
    const found = await withTransaction(pool, async (connection) => {
      const [materials] = await connection.query<RowDataPacket[]>(
        `SELECT cost_material_name FROM cost_material
         WHERE id_cost_material = ? AND id_master_comp = ? AND cost_material_deleted_at IS NULL`,
        [id, scope.idMasterComp],
      );
      if (!materials.length) return false;
      await connection.query(
        `INSERT INTO cost_material_price
           (id_cost_material, id_master_comp, cost_material_price_amount, cost_material_price_from,
            cost_material_price_note, id_created_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE cost_material_price_amount = VALUES(cost_material_price_amount),
           cost_material_price_note = VALUES(cost_material_price_note)`,
        [
          id,
          scope.idMasterComp,
          price,
          from,
          trimTo(req.body?.note, 255) || null,
          scope.idAdminAcct,
        ],
      );
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.material_price_saved',
        action: 'update',
        entityType: 'cost_material',
        entityId: id,
        entityLabel: materials[0].cost_material_name,
        after: { price, from },
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'COSTING_MATERIAL_NOT_FOUND', 'Material not found');
    return sendSuccess(res, 200, 'COSTING_PRICE_SAVED', 'Price saved');
  },
);

//==================================================
//==== CHANNELS
//==================================================

router.get(
  '/api/v1/costing/channels',
  verifyToken,
  requirePermission('cost.view'),
  onFailure('COSTING_CHANNELS_FAILED', 'Unable to load the channels'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await ensureChannels(pool, scope.idMasterComp);
    const [channels] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sales_channel WHERE id_master_comp = ? AND sales_channel_deleted_at IS NULL
       ORDER BY sales_channel_sort_order, id_sales_channel`,
      [scope.idMasterComp],
    );
    const [fees] = await pool.query<RowDataPacket[]>(
      `SELECT f.*, n.product_category_name FROM sales_channel_fee f
       LEFT JOIN product_category_i18n n
         ON n.id_product_category = f.id_product_category AND n.product_category_locale = 'id-ID'
       WHERE f.id_master_comp = ?
       ORDER BY f.sales_channel_fee_from DESC, f.id_sales_channel_fee`,
      [scope.idMasterComp],
    );
    const data = channels.map((channel) => ({
      id: keyhsid.idSalesChannel.encode(channel.id_sales_channel),
      name: channel.sales_channel_name,
      status: Boolean(channel.sales_channel_status),
      fees: fees
        .filter((fee) => fee.id_sales_channel === channel.id_sales_channel)
        .map((fee) => ({
          id: keyhsid.idSalesChannelFee.encode(fee.id_sales_channel_fee),
          name: fee.sales_channel_fee_name,
          type: fee.sales_channel_fee_type,
          value: Number(fee.sales_channel_fee_value),
          cap: fee.sales_channel_fee_cap == null ? null : Number(fee.sales_channel_fee_cap),
          per: fee.sales_channel_fee_per,
          from: dateText(fee.sales_channel_fee_from),
          to: fee.sales_channel_fee_to ? dateText(fee.sales_channel_fee_to) : null,
          category_id: fee.id_product_category
            ? keyhsid.idProductCategory.encode(fee.id_product_category)
            : null,
          category_name: fee.product_category_name ?? null,
        })),
    }));
    return sendList(res, 'COSTING_CHANNELS_FOUND', 'Channels loaded', data, { total: data.length });
  },
);

router.put(
  '/api/v1/costing/channels/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_CHANNEL_SAVE_FAILED', 'Unable to save the channel'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idSalesChannel);
    const name = trimTo(req.body?.name, 100);
    if (!id) return sendError(res, 404, 'COSTING_CHANNEL_NOT_FOUND', 'Channel not found');
    if (!name) return sendError(res, 400, 'COSTING_CHANNEL_INVALID', 'Check the name');
    const found = await withTransaction(pool, async (connection) => {
      const [result] = await connection.query(
        `UPDATE sales_channel SET sales_channel_name = ?, sales_channel_status = ?
         WHERE id_sales_channel = ? AND id_master_comp = ? AND sales_channel_deleted_at IS NULL`,
        [name, req.body?.status === false ? 0 : 1, id, scope.idMasterComp],
      );
      if (!(result as { affectedRows: number }).affectedRows) return false;
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.channel_updated',
        action: 'update',
        entityType: 'sales_channel',
        entityId: id,
        entityLabel: name,
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'COSTING_CHANNEL_NOT_FOUND', 'Channel not found');
    return sendSuccess(res, 200, 'COSTING_CHANNEL_UPDATED', 'Channel saved');
  },
);

const readFee = (body: AuthRequest['body']) => {
  const name = trimTo(body?.name, 100);
  const type = String(body?.type ?? 'percent');
  const per = String(body?.per ?? 'item');
  const value = Number(body?.value);
  const cap = body?.cap === '' || body?.cap == null ? null : Number(body.cap);
  const from = body?.from;
  const to = body?.to === '' || body?.to == null ? null : body.to;
  const category = body?.category_id ? decodeId(body.category_id, keyhsid.idProductCategory) : null;
  if (
    !name ||
    !['percent', 'fixed'].includes(type) ||
    !['item', 'order'].includes(per) ||
    !Number.isFinite(value) ||
    value < 0 ||
    (type === 'percent' && value >= 100) ||
    (cap != null && (!Number.isFinite(cap) || cap < 0)) ||
    !isDate(from) ||
    (to != null && (!isDate(to) || to < from)) ||
    (body?.category_id && !category)
  ) {
    return null;
  }
  return { name, type, per, value, cap, from, to, category };
};

router.post(
  '/api/v1/costing/channels/:id/fees',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_FEE_SAVE_FAILED', 'Unable to save the charge'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idSalesChannel);
    const fee = readFee(req.body);
    if (!id) return sendError(res, 404, 'COSTING_CHANNEL_NOT_FOUND', 'Channel not found');
    if (!fee) return sendError(res, 400, 'COSTING_FEE_INVALID', 'Check the charge');
    const created = await withTransaction(pool, async (connection) => {
      const [channels] = await connection.query<RowDataPacket[]>(
        `SELECT sales_channel_name FROM sales_channel
         WHERE id_sales_channel = ? AND id_master_comp = ? AND sales_channel_deleted_at IS NULL`,
        [id, scope.idMasterComp],
      );
      if (!channels.length) return null;
      const [result] = await connection.query(
        `INSERT INTO sales_channel_fee
           (id_sales_channel, id_master_comp, id_product_category, sales_channel_fee_name,
            sales_channel_fee_type, sales_channel_fee_value, sales_channel_fee_cap, sales_channel_fee_per,
            sales_channel_fee_from, sales_channel_fee_to, id_created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          scope.idMasterComp,
          fee.category,
          fee.name,
          fee.type,
          fee.value,
          fee.cap,
          fee.per,
          fee.from,
          fee.to,
          scope.idAdminAcct,
        ],
      );
      const idFee = (result as { insertId: number }).insertId;
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.fee_created',
        action: 'create',
        entityType: 'sales_channel_fee',
        entityId: idFee,
        entityLabel: `${channels[0].sales_channel_name}: ${fee.name}`,
        after: fee,
      });
      return idFee;
    });
    if (!created) return sendError(res, 404, 'COSTING_CHANNEL_NOT_FOUND', 'Channel not found');
    return sendSuccess(res, 201, 'COSTING_FEE_CREATED', 'Charge saved', {
      id: keyhsid.idSalesChannelFee.encode(created),
    });
  },
);

router.put(
  '/api/v1/costing/fees/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_FEE_SAVE_FAILED', 'Unable to save the charge'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idSalesChannelFee);
    const fee = readFee(req.body);
    if (!id) return sendError(res, 404, 'COSTING_FEE_NOT_FOUND', 'Charge not found');
    if (!fee) return sendError(res, 400, 'COSTING_FEE_INVALID', 'Check the charge');
    const found = await withTransaction(pool, async (connection) => {
      const [result] = await connection.query(
        `UPDATE sales_channel_fee SET id_product_category = ?, sales_channel_fee_name = ?,
           sales_channel_fee_type = ?, sales_channel_fee_value = ?, sales_channel_fee_cap = ?,
           sales_channel_fee_per = ?, sales_channel_fee_from = ?, sales_channel_fee_to = ?
         WHERE id_sales_channel_fee = ? AND id_master_comp = ?`,
        [
          fee.category,
          fee.name,
          fee.type,
          fee.value,
          fee.cap,
          fee.per,
          fee.from,
          fee.to,
          id,
          scope.idMasterComp,
        ],
      );
      if (!(result as { affectedRows: number }).affectedRows) return false;
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.fee_updated',
        action: 'update',
        entityType: 'sales_channel_fee',
        entityId: id,
        entityLabel: fee.name,
        after: fee,
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'COSTING_FEE_NOT_FOUND', 'Charge not found');
    return sendSuccess(res, 200, 'COSTING_FEE_UPDATED', 'Charge saved');
  },
);

router.delete(
  '/api/v1/costing/fees/:id',
  verifyToken,
  requirePermission('cost.manage'),
  onFailure('COSTING_FEE_DELETE_FAILED', 'Unable to delete the charge'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = decodeId(req.params.id, keyhsid.idSalesChannelFee);
    if (!id) return sendError(res, 404, 'COSTING_FEE_NOT_FOUND', 'Charge not found');
    const found = await withTransaction(pool, async (connection) => {
      const [fees] = await connection.query<RowDataPacket[]>(
        'SELECT sales_channel_fee_name FROM sales_channel_fee WHERE id_sales_channel_fee = ? AND id_master_comp = ?',
        [id, scope.idMasterComp],
      );
      if (!fees.length) return false;
      await connection.query('DELETE FROM sales_channel_fee WHERE id_sales_channel_fee = ?', [id]);
      await auditCosting(req, connection, scope, {
        eventCode: 'costing.fee_deleted',
        action: 'delete',
        entityType: 'sales_channel_fee',
        entityId: id,
        entityLabel: fees[0].sales_channel_fee_name,
      });
      return true;
    });
    if (!found) return sendError(res, 404, 'COSTING_FEE_NOT_FOUND', 'Charge not found');
    return sendSuccess(res, 200, 'COSTING_FEE_DELETED', 'Charge deleted');
  },
);

export default router;
