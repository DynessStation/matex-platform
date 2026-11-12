// Imported orders and payouts, per store and period, with the product each SKU maps to.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { sendList } from '../../../helper/api-response.helper';
import { dateText } from '../../../helper/business.helper';
import { pageMeta, parseListQuery } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { rangeOf, scopeOf, storeOf, storeWhere } from './shared';

const router = express.Router();
const { pool } = db;

const money = (value: unknown) => Number(value ?? 0);

/** Orders, newest first. ?store=, ?from=, ?to= (order date), ?search= (order id or product). */
router.get(
  '/api/v1/sales/orders',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_ORDERS_FAILED', 'Unable to load the orders'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const store = await storeOf(pool, scope, req.query.store, false);
    const { from, to } = rangeOf(req.query as Record<string, unknown>);
    const list = parseListQuery(req.query as Record<string, unknown>, { defaultLimit: 25 });
    const visible = storeWhere(scope);
    const where = `o.id_master_comp = ? ${visible.sql}
      ${store ? 'AND o.id_store = ?' : ''}
      ${from ? 'AND o.sales_order_at >= ?' : ''} ${to ? 'AND o.sales_order_at < DATE_ADD(?, INTERVAL 1 DAY)' : ''}
      ${
        list.search
          ? `AND (o.sales_order_ref LIKE ? OR EXISTS (SELECT 1 FROM sales_order_line sl
               WHERE sl.id_sales_order = o.id_sales_order AND (sl.sales_order_line_product_name LIKE ?
                 OR sl.sales_order_line_seller_sku LIKE ?)))`
          : ''
      }`;
    const params = [
      scope.idMasterComp,
      ...visible.params,
      ...(store ? [store.id_store] : []),
      ...(from ? [from] : []),
      ...(to ? [to] : []),
      ...(list.search ? [list.searchValue, list.searchValue, list.searchValue] : []),
    ];
    const [totals] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(o.sales_order_amount), 0) AS amount
       FROM sales_order o INNER JOIN store s ON s.id_store = o.id_store WHERE ${where}`,
      params,
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id_sales_order, o.id_store, s.store_name, o.sales_order_ref, o.sales_order_status,
         o.sales_order_at, o.sales_order_paid_at, o.sales_order_payment_method,
         o.sales_order_province, o.sales_order_city, o.sales_order_source, o.sales_order_amount,
         o.sales_order_shipping_fee,
         (SELECT st.sales_settlement_amount FROM sales_settlement st
          WHERE st.id_store = o.id_store AND st.sales_settlement_order_ref = o.sales_order_ref
            AND st.sales_settlement_kind = 'order' LIMIT 1) AS settled_amount
       FROM sales_order o INNER JOIN store s ON s.id_store = o.id_store
       WHERE ${where}
       ORDER BY o.sales_order_at DESC, o.id_sales_order DESC LIMIT ? OFFSET ?`,
      [...params, list.limit, list.offset],
    );
    const ids = rows.map((row) => Number(row.id_sales_order));
    const [lines] = ids.length
      ? await pool.query<RowDataPacket[]>(
          `SELECT l.id_sales_order, l.sales_order_line_sku_ref, l.sales_order_line_seller_sku,
             l.sales_order_line_product_name, l.sales_order_line_variation, l.sales_order_line_qty,
             l.sales_order_line_returned_qty, l.sales_order_line_unit_price,
             l.sales_order_line_discount_platform, l.sales_order_line_discount_seller,
             l.sales_order_line_subtotal, m.id_product, i.product_name, p.product_sku
           FROM sales_order_line l
           INNER JOIN sales_order o ON o.id_sales_order = l.id_sales_order
           LEFT JOIN store_sku_map m ON m.id_store = o.id_store AND m.store_sku_map_ref = l.sales_order_line_sku_ref
           LEFT JOIN product_catalog p ON p.id_product = m.id_product
           LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = 'id-ID'
           WHERE l.id_sales_order IN (?)
           ORDER BY l.id_sales_order_line`,
          [ids],
        )
      : [[] as RowDataPacket[]];
    const byOrder = new Map<number, unknown[]>();
    for (const line of lines) {
      const list = byOrder.get(Number(line.id_sales_order)) ?? [];
      list.push({
        sku_ref: line.sales_order_line_sku_ref,
        seller_sku: line.sales_order_line_seller_sku,
        name: line.sales_order_line_product_name,
        variation: line.sales_order_line_variation,
        qty: Number(line.sales_order_line_qty),
        returned_qty: Number(line.sales_order_line_returned_qty),
        unit_price: money(line.sales_order_line_unit_price),
        discount_platform: money(line.sales_order_line_discount_platform),
        discount_seller: money(line.sales_order_line_discount_seller),
        subtotal: money(line.sales_order_line_subtotal),
        product_id: line.id_product ? keyhsid.idProduct.encode(Number(line.id_product)) : null,
        product_name: line.product_name ?? null,
        product_sku: line.product_sku ?? null,
      });
      byOrder.set(Number(line.id_sales_order), list);
    }
    const data = rows.map((row) => ({
      id: keyhsid.idSalesOrder.encode(row.id_sales_order),
      store_id: keyhsid.idStore.encode(row.id_store),
      store_name: row.store_name,
      ref: row.sales_order_ref,
      status: row.sales_order_status,
      ordered_at: row.sales_order_at,
      paid_at: row.sales_order_paid_at,
      payment_method: row.sales_order_payment_method,
      province: row.sales_order_province,
      city: row.sales_order_city,
      source: row.sales_order_source,
      amount: money(row.sales_order_amount),
      shipping_fee: money(row.sales_order_shipping_fee),
      settled_amount: row.settled_amount == null ? null : money(row.settled_amount),
      lines: byOrder.get(Number(row.id_sales_order)) ?? [],
    }));
    return sendList(res, 'SALES_ORDERS_FOUND', 'Orders loaded', data, {
      ...pageMeta(list, Number(totals[0]?.total ?? 0)),
      amount: money(totals[0]?.amount),
    } as ReturnType<typeof pageMeta> & { amount: number });
  },
);

/** Payouts, newest first. ?store=, ?from=, ?to= (settlement date), ?kind=order|adjustment. */
router.get(
  '/api/v1/sales/settlements',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_SETTLEMENTS_FAILED', 'Unable to load the payouts'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const store = await storeOf(pool, scope, req.query.store, false);
    const { from, to } = rangeOf(req.query as Record<string, unknown>);
    const kind =
      req.query.kind === 'order' || req.query.kind === 'adjustment' ? req.query.kind : null;
    const list = parseListQuery(req.query as Record<string, unknown>, { defaultLimit: 25 });
    const visible = storeWhere(scope);
    const where = `t.id_master_comp = ? ${visible.sql}
      ${store ? 'AND t.id_store = ?' : ''} ${kind ? 'AND t.sales_settlement_kind = ?' : ''}
      ${from ? 'AND t.sales_settlement_settled_at >= ?' : ''} ${to ? 'AND t.sales_settlement_settled_at <= ?' : ''}
      ${list.search ? 'AND (t.sales_settlement_ref LIKE ? OR t.sales_settlement_label LIKE ?)' : ''}`;
    const params = [
      scope.idMasterComp,
      ...visible.params,
      ...(store ? [store.id_store] : []),
      ...(kind ? [kind] : []),
      ...(from ? [from] : []),
      ...(to ? [to] : []),
      ...(list.search ? [list.searchValue, list.searchValue] : []),
    ];
    const [totals] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(t.sales_settlement_amount), 0) AS amount,
         COALESCE(SUM(t.sales_settlement_revenue), 0) AS revenue,
         COALESCE(SUM(t.sales_settlement_fees), 0) AS fees,
         COALESCE(SUM(CASE WHEN t.sales_settlement_kind = 'adjustment' THEN t.sales_settlement_amount END), 0) AS adjustments
       FROM sales_settlement t INNER JOIN store s ON s.id_store = t.id_store WHERE ${where}`,
      params,
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id_sales_settlement, t.id_store, s.store_name, t.sales_settlement_ref,
         t.sales_settlement_kind, t.sales_settlement_label, t.sales_settlement_order_ref,
         t.sales_settlement_order_at, t.sales_settlement_settled_at, t.sales_settlement_amount,
         t.sales_settlement_revenue, t.sales_settlement_fees, t.sales_settlement_source,
         t.sales_settlement_detail
       FROM sales_settlement t INNER JOIN store s ON s.id_store = t.id_store
       WHERE ${where}
       ORDER BY t.sales_settlement_settled_at DESC, t.id_sales_settlement DESC LIMIT ? OFFSET ?`,
      [...params, list.limit, list.offset],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idSalesSettlement.encode(row.id_sales_settlement),
      store_id: keyhsid.idStore.encode(row.id_store),
      store_name: row.store_name,
      ref: row.sales_settlement_ref,
      kind: row.sales_settlement_kind,
      label: row.sales_settlement_label,
      order_ref: row.sales_settlement_order_ref,
      ordered_at: dateText(row.sales_settlement_order_at),
      settled_at: dateText(row.sales_settlement_settled_at),
      amount: money(row.sales_settlement_amount),
      revenue: money(row.sales_settlement_revenue),
      fees: money(row.sales_settlement_fees),
      source: row.sales_settlement_source,
      detail:
        typeof row.sales_settlement_detail === 'string'
          ? JSON.parse(row.sales_settlement_detail)
          : (row.sales_settlement_detail ?? {}),
    }));
    return sendList(res, 'SALES_SETTLEMENTS_FOUND', 'Payouts loaded', data, {
      ...pageMeta(list, Number(totals[0]?.total ?? 0)),
      amount: money(totals[0]?.amount),
      revenue: money(totals[0]?.revenue),
      fees: money(totals[0]?.fees),
      adjustments: money(totals[0]?.adjustments),
    } as ReturnType<typeof pageMeta> & Record<string, number>);
  },
);

/** The stores the account may import into, with counts. */
router.get(
  '/api/v1/sales/stores',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_STORES_FAILED', 'Unable to load the stores'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const visible = storeWhere(scope);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id_store, s.store_name, be.business_entity_name, sc.sales_channel_name, s.store_status,
         (SELECT COUNT(*) FROM sales_order o WHERE o.id_store = s.id_store) AS orders,
         (SELECT COUNT(*) FROM sales_settlement t WHERE t.id_store = s.id_store) AS settlements,
         (SELECT COUNT(*) FROM store_sku_map m WHERE m.id_store = s.id_store AND m.id_product IS NULL) AS unmapped,
         (SELECT MAX(i.created) FROM sales_import i WHERE i.id_store = s.id_store) AS last_import
       FROM store s
       INNER JOIN business_entity be ON be.id_business_entity = s.id_business_entity
       INNER JOIN sales_channel sc ON sc.id_sales_channel = s.id_sales_channel
       WHERE s.id_master_comp = ? AND s.store_deleted_at IS NULL ${visible.sql}
       ORDER BY be.business_entity_name, s.store_name`,
      [scope.idMasterComp, ...visible.params],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idStore.encode(row.id_store),
      name: row.store_name,
      entity_name: row.business_entity_name,
      channel_name: row.sales_channel_name,
      status: Number(row.store_status) === 1,
      orders: Number(row.orders),
      settlements: Number(row.settlements),
      unmapped: Number(row.unmapped),
      last_import: row.last_import,
    }));
    return sendList(res, 'SALES_STORES_FOUND', 'Stores loaded', data, { total: data.length });
  },
);

export default router;
