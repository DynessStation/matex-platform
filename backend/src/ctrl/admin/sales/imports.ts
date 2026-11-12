// A Seller Center file for one store: read and reported first, saved when asked again.
// The file is held in memory only. Orders and payouts are keyed by the channel's own ids, so
// the same file twice changes nothing and a newer export updates what it covers.
import express = require('express');
import { Response } from 'express';
import multer from 'multer';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import {
  ParsedOrder,
  ParsedSettlement,
  parseSalesFile,
  SalesFileError,
} from '../../../helper/sales-import.helper';
import { dateText } from '../../../helper/business.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { auditSales, scopeOf, storeOf, storeWhere, VisibleStore } from './shared';

const router = express.Router();
const { pool } = db;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024, files: 1 },
});

const uploadFile = (req: AuthRequest, res: Response, next: express.NextFunction): void => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error)
      sendError(res, 400, 'SALES_IMPORT_FILE', 'The file could not be read (16 MB at most)');
    else next();
  });
};

const minMax = (dates: (string | null)[]) => {
  const known = dates.filter((d): d is string => !!d).map((d) => d.slice(0, 10));
  known.sort();
  return { from: known[0] ?? null, to: known[known.length - 1] ?? null };
};

const existingRefs = async (
  connection: PoolConnection | typeof pool,
  table: 'sales_order' | 'sales_settlement',
  idStore: number,
  refs: string[],
): Promise<Set<string>> => {
  if (!refs.length) return new Set();
  const column = table === 'sales_order' ? 'sales_order_ref' : 'sales_settlement_ref';
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT ${column} AS ref FROM ${table} WHERE id_store = ? AND ${column} IN (?)`,
    [idStore, refs],
  );
  return new Set(rows.map((row) => String(row.ref)));
};

interface SkuSeen {
  ref: string;
  seller_sku: string | null;
  name: string | null;
  variation: string | null;
}

/** The SKUs of these orders that no product is mapped to yet. */
const unmappedSkus = async (idStore: number, orders: ParsedOrder[]): Promise<SkuSeen[]> => {
  const seen = new Map<string, SkuSeen>();
  for (const order of orders) {
    for (const line of order.lines) {
      if (line.skuRef && !seen.has(line.skuRef)) {
        seen.set(line.skuRef, {
          ref: line.skuRef,
          seller_sku: line.sellerSku,
          name: line.productName,
          variation: line.variation,
        });
      }
    }
  }
  if (!seen.size) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT store_sku_map_ref AS ref FROM store_sku_map
     WHERE id_store = ? AND id_product IS NOT NULL AND store_sku_map_ref IN (?)`,
    [idStore, [...seen.keys()]],
  );
  for (const row of rows) seen.delete(String(row.ref));
  return [...seen.values()];
};

const saveOrders = async (
  connection: PoolConnection,
  scope: AdminScope,
  store: VisibleStore,
  idImport: number,
  orders: ParsedOrder[],
) => {
  for (const order of orders) {
    await connection.query(
      `INSERT INTO sales_order (id_master_comp, id_store, sales_order_ref, sales_order_status,
         sales_order_at, sales_order_paid_at, sales_order_payment_method, sales_order_province,
         sales_order_city, sales_order_source, sales_order_amount, sales_order_shipping_fee,
         id_sales_import)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id_sales_order = LAST_INSERT_ID(id_sales_order),
         sales_order_status = VALUES(sales_order_status),
         sales_order_at = COALESCE(VALUES(sales_order_at), sales_order_at),
         sales_order_paid_at = COALESCE(VALUES(sales_order_paid_at), sales_order_paid_at),
         sales_order_payment_method = COALESCE(VALUES(sales_order_payment_method), sales_order_payment_method),
         sales_order_province = COALESCE(VALUES(sales_order_province), sales_order_province),
         sales_order_city = COALESCE(VALUES(sales_order_city), sales_order_city),
         sales_order_source = COALESCE(VALUES(sales_order_source), sales_order_source),
         sales_order_amount = VALUES(sales_order_amount),
         sales_order_shipping_fee = VALUES(sales_order_shipping_fee),
         id_sales_import = VALUES(id_sales_import), updated = NOW()`,
      [
        scope.idMasterComp,
        store.id_store,
        order.ref,
        order.status,
        order.orderedAt,
        order.paidAt,
        order.paymentMethod,
        order.province,
        order.city,
        order.source,
        order.amount,
        order.shippingFee,
        idImport,
      ],
    );
    const [ids] = await connection.query<RowDataPacket[]>('SELECT LAST_INSERT_ID() AS id');
    const idOrder = Number(ids[0].id);
    await connection.query('DELETE FROM sales_order_line WHERE id_sales_order = ?', [idOrder]);
    if (order.lines.length) {
      await connection.query(
        `INSERT INTO sales_order_line (id_sales_order, sales_order_line_sku_ref,
           sales_order_line_seller_sku, sales_order_line_product_name, sales_order_line_variation,
           sales_order_line_qty, sales_order_line_returned_qty, sales_order_line_unit_price,
           sales_order_line_discount_platform, sales_order_line_discount_seller,
           sales_order_line_subtotal)
         VALUES ?`,
        [
          order.lines.map((line) => [
            idOrder,
            line.skuRef,
            line.sellerSku,
            line.productName,
            line.variation,
            line.qty,
            line.returnedQty,
            line.unitPrice,
            line.discountPlatform,
            line.discountSeller,
            line.subtotal,
          ]),
        ],
      );
    }
  }
  // Every SKU seen gets a row of the map, for the team to point at a product.
  const skus = new Map<string, ParsedOrder['lines'][number]>();
  for (const order of orders) {
    for (const line of order.lines)
      if (line.skuRef && !skus.has(line.skuRef)) skus.set(line.skuRef, line);
  }
  if (skus.size) {
    await connection.query(
      `INSERT INTO store_sku_map (id_master_comp, id_store, store_sku_map_ref,
         store_sku_map_seller_sku, store_sku_map_product_name, store_sku_map_variation)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         store_sku_map_seller_sku = COALESCE(VALUES(store_sku_map_seller_sku), store_sku_map_seller_sku),
         store_sku_map_product_name = COALESCE(VALUES(store_sku_map_product_name), store_sku_map_product_name),
         store_sku_map_variation = COALESCE(VALUES(store_sku_map_variation), store_sku_map_variation)`,
      [
        [...skus.values()].map((line) => [
          scope.idMasterComp,
          store.id_store,
          line.skuRef,
          line.sellerSku,
          line.productName,
          line.variation,
        ]),
      ],
    );
  }
};

const saveSettlements = async (
  connection: PoolConnection,
  scope: AdminScope,
  store: VisibleStore,
  idImport: number,
  settlements: ParsedSettlement[],
) => {
  for (const row of settlements) {
    await connection.query(
      `INSERT INTO sales_settlement (id_master_comp, id_store, sales_settlement_ref,
         sales_settlement_kind, sales_settlement_label, sales_settlement_order_ref,
         sales_settlement_order_at, sales_settlement_settled_at, sales_settlement_amount,
         sales_settlement_revenue, sales_settlement_fees, sales_settlement_source,
         sales_settlement_detail, id_sales_import)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sales_settlement_kind = VALUES(sales_settlement_kind),
         sales_settlement_label = VALUES(sales_settlement_label),
         sales_settlement_order_ref = VALUES(sales_settlement_order_ref),
         sales_settlement_order_at = VALUES(sales_settlement_order_at),
         sales_settlement_settled_at = VALUES(sales_settlement_settled_at),
         sales_settlement_amount = VALUES(sales_settlement_amount),
         sales_settlement_revenue = VALUES(sales_settlement_revenue),
         sales_settlement_fees = VALUES(sales_settlement_fees),
         sales_settlement_source = VALUES(sales_settlement_source),
         sales_settlement_detail = VALUES(sales_settlement_detail),
         id_sales_import = VALUES(id_sales_import), updated = NOW()`,
      [
        scope.idMasterComp,
        store.id_store,
        row.ref,
        row.kind,
        row.label,
        row.orderRef,
        row.orderedAt,
        row.settledAt,
        row.amount,
        row.revenue,
        row.fees,
        row.source,
        JSON.stringify(row.detail),
        idImport,
      ],
    );
  }
};

router.post(
  '/api/v1/sales/imports',
  verifyToken,
  requirePermission('sales.import'),
  uploadFile,
  onFailure('SALES_IMPORT_FAILED', 'Unable to import the file'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const store = (await storeOf(pool, scope, req.body?.store, true)) as VisibleStore;
    if (!req.file) return sendError(res, 400, 'SALES_IMPORT_FILE', 'Choose the file');
    const fileName = req.file.originalname?.slice(0, 255) || 'file';

    let parsed;
    try {
      parsed = await parseSalesFile(req.file.buffer, fileName);
    } catch (error) {
      if (error instanceof SalesFileError) {
        return sendError(res, 400, 'SALES_IMPORT_UNREADABLE', error.message);
      }
      throw error;
    }

    const refs =
      parsed.kind === 'orders'
        ? parsed.orders.map((order) => order.ref)
        : parsed.settlements.map((row) => row.ref);
    const known = await existingRefs(
      pool,
      parsed.kind === 'orders' ? 'sales_order' : 'sales_settlement',
      store.id_store,
      refs,
    );
    const summary = {
      kind: parsed.kind,
      store: { id: keyhsid.idStore.encode(store.id_store), name: store.store_name },
      file: fileName,
      rows:
        parsed.kind === 'orders'
          ? parsed.orders.reduce((sum, order) => sum + order.lines.length, 0)
          : parsed.settlements.length,
      records: refs.length,
      new_records: refs.filter((ref) => !known.has(ref)).length,
      updated_records: refs.filter((ref) => known.has(ref)).length,
      period:
        parsed.kind === 'orders'
          ? minMax(parsed.orders.map((order) => order.orderedAt))
          : minMax(parsed.settlements.map((row) => row.settledAt ?? row.orderedAt)),
      amount:
        parsed.kind === 'orders'
          ? parsed.orders.reduce((sum, order) => sum + order.amount, 0)
          : parsed.settlements.reduce((sum, row) => sum + row.amount, 0),
      adjustments:
        parsed.kind === 'settlement'
          ? parsed.settlements.filter((row) => row.kind === 'adjustment').length
          : 0,
      unknown_skus:
        parsed.kind === 'orders' ? await unmappedSkus(store.id_store, parsed.orders) : [],
    };

    if (String(req.body?.apply ?? '') !== '1') {
      return sendSuccess(res, 200, 'SALES_IMPORT_REPORT', 'File read, nothing saved', {
        summary,
        issues: parsed.issues,
        saved: false,
      });
    }

    const idImport = await withTransaction(pool, async (connection) => {
      const [insert] = await connection.query(
        `INSERT INTO sales_import (id_master_comp, id_store, sales_import_kind, sales_import_file,
           sales_import_rows, sales_import_new, sales_import_updated, sales_import_from,
           sales_import_to, id_created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          store.id_store,
          parsed.kind,
          fileName,
          summary.rows,
          summary.new_records,
          summary.updated_records,
          summary.period.from,
          summary.period.to,
          scope.idAdminAcct,
        ],
      );
      const id = (insert as { insertId: number }).insertId;
      if (parsed.kind === 'orders') await saveOrders(connection, scope, store, id, parsed.orders);
      else await saveSettlements(connection, scope, store, id, parsed.settlements);
      await auditSales(req, connection, scope, {
        eventCode: `sales.${parsed.kind}_imported`,
        action: 'import',
        entityType: 'sales_import',
        entityId: id,
        entityLabel: `${store.store_name}: ${fileName}`,
        after: {
          kind: parsed.kind,
          records: summary.records,
          new_records: summary.new_records,
          updated_records: summary.updated_records,
          period: summary.period,
        },
      });
      return id;
    });

    return sendSuccess(res, 200, 'SALES_IMPORT_SAVED', 'File saved', {
      summary,
      issues: parsed.issues,
      saved: true,
      import_id: keyhsid.idSalesImport.encode(idImport),
    });
  },
);

/** The last uploads, newest first, of the stores the account may see (?store= narrows). */
router.get(
  '/api/v1/sales/imports',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_IMPORTS_FAILED', 'Unable to load the import history'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const store = await storeOf(pool, scope, req.query.store, false);
    const visible = storeWhere(scope);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.id_sales_import, i.id_store, s.store_name, i.sales_import_kind, i.sales_import_file,
         i.sales_import_rows, i.sales_import_new, i.sales_import_updated, i.sales_import_from,
         i.sales_import_to, i.created, a.alias AS created_by
       FROM sales_import i
       INNER JOIN store s ON s.id_store = i.id_store
       LEFT JOIN admin_acct a ON a.id_admin_acct = i.id_created_by
       WHERE i.id_master_comp = ? ${visible.sql} ${store ? 'AND i.id_store = ?' : ''}
       ORDER BY i.id_sales_import DESC LIMIT 100`,
      [scope.idMasterComp, ...visible.params, ...(store ? [store.id_store] : [])],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idSalesImport.encode(row.id_sales_import),
      store_id: keyhsid.idStore.encode(row.id_store),
      store_name: row.store_name,
      kind: row.sales_import_kind,
      file: row.sales_import_file,
      rows: Number(row.sales_import_rows),
      new_records: Number(row.sales_import_new),
      updated_records: Number(row.sales_import_updated),
      from: dateText(row.sales_import_from),
      to: dateText(row.sales_import_to),
      created: row.created,
      created_by: row.created_by,
    }));
    return sendList(res, 'SALES_IMPORTS_FOUND', 'Import history loaded', data, {
      total: data.length,
    });
  },
);

export default router;
