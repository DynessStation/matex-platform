// Dasbor Uang: what the stores earned in a period, what the channel kept, what the goods cost,
// and the book of each party (ledger_entry), under /api/v1/money. Internal only. Contract:
// ops/e2e/write/money-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import { sendError, sendList, sendSuccess } from '../../helper/api-response.helper';
import {
  assertPlatformStaff,
  dateText,
  entityWhere,
  isDate,
  loadEntity,
  platformEntityId,
} from '../../helper/business.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { postSettlements, productCosts } from '../../helper/money.helper';
import { nullableString, trimTo } from '../../helper/input.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';
import { auditSales, rangeOf, scopeOf, storeOf } from './sales/shared';

const router = express.Router();
const { pool } = db;

const money = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Math.round(value * 100) / 100;

/** The entity of ?entity= when the account may see it, else null (all visible). */
const entityOf = async (req: AuthRequest, scope: Parameters<typeof loadEntity>[1]) => {
  const raw = req.query.entity;
  if (raw === undefined || raw === '') return null;
  const id = decodeId(raw, keyhsid.idBusinessEntity);
  if (!id) throw new HttpError(400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');
  await loadEntity(pool, scope, id);
  return id;
};

/**
 * The period's figures, by settlement date: revenue, channel fees, adjustments, payout, HPP of
 * the goods sold, and gross profit; then the same per store and per product, and the period's
 * book rows summed per party and kind.
 */
router.get(
  '/api/v1/money/summary',
  verifyToken,
  requirePermission('money.view'),
  onFailure('MONEY_SUMMARY_FAILED', 'Unable to load the dashboard'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const { from, to } = rangeOf(req.query as Record<string, unknown>);
    const entity = await entityOf(req, scope);
    const store = await storeOf(pool, scope, req.query.store, false);
    const visible = entityWhere(scope, 's.id_business_entity');
    const where = `t.id_master_comp = ? ${visible.sql}
      ${entity ? 'AND s.id_business_entity = ?' : ''} ${store ? 'AND t.id_store = ?' : ''}
      ${from ? 'AND t.sales_settlement_settled_at >= ?' : ''} ${to ? 'AND t.sales_settlement_settled_at <= ?' : ''}`;
    const params = [
      scope.idMasterComp,
      ...visible.params,
      ...(entity ? [entity] : []),
      ...(store ? [store.id_store] : []),
      ...(from ? [from] : []),
      ...(to ? [to] : []),
    ];
    const [totals] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(CASE WHEN t.sales_settlement_kind = 'order' THEN 1 END) AS orders,
         COALESCE(SUM(t.sales_settlement_revenue), 0) AS revenue,
         COALESCE(SUM(t.sales_settlement_fees), 0) AS fees,
         COALESCE(SUM(CASE WHEN t.sales_settlement_kind = 'adjustment' THEN t.sales_settlement_amount END), 0) AS adjustments,
         COALESCE(SUM(t.sales_settlement_amount), 0) AS amount
       FROM sales_settlement t INNER JOIN store s ON s.id_store = t.id_store WHERE ${where}`,
      params,
    );
    // The lines behind the settled orders, with the product each SKU maps to.
    const [lines] = await pool.query<RowDataPacket[]>(
      `SELECT t.id_store, s.store_name, be.business_entity_name, t.sales_settlement_order_ref, t.sales_settlement_amount,
         t.sales_settlement_revenue, l.sales_order_line_qty, l.sales_order_line_subtotal,
         l.sales_order_line_product_name, l.sales_order_line_variation, m.id_product,
         i.product_name, p.product_sku,
         (SELECT SUM(x.sales_order_line_subtotal) FROM sales_order_line x WHERE x.id_sales_order = o.id_sales_order) AS order_subtotal,
         (SELECT COUNT(*) FROM sales_order_line x WHERE x.id_sales_order = o.id_sales_order) AS order_lines
       FROM sales_settlement t
       INNER JOIN store s ON s.id_store = t.id_store
       INNER JOIN business_entity be ON be.id_business_entity = s.id_business_entity
       INNER JOIN sales_order o ON o.id_store = t.id_store AND o.sales_order_ref = t.sales_settlement_order_ref
       INNER JOIN sales_order_line l ON l.id_sales_order = o.id_sales_order
       LEFT JOIN store_sku_map m ON m.id_store = o.id_store AND m.store_sku_map_ref = l.sales_order_line_sku_ref
       LEFT JOIN product_catalog p ON p.id_product = m.id_product
       LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = 'id-ID'
       WHERE ${where} AND t.sales_settlement_kind = 'order'`,
      params,
    );
    const costs = lines.length
      ? await productCosts(pool, scope.idMasterComp)
      : new Map<number, number>();
    interface Bucket {
      key: string;
      name: string;
      detail: string | null;
      qty: number;
      revenue: number;
      amount: number;
      hpp: number;
      unmapped: boolean;
    }
    const byStore = new Map<number, Bucket & { orders: Set<string> }>();
    const byProduct = new Map<string, Bucket>();
    let hppTotal = 0;
    let unmappedQty = 0;
    for (const line of lines) {
      const orderSubtotal = Number(line.order_subtotal);
      const weight =
        orderSubtotal > 0
          ? Number(line.sales_order_line_subtotal) / orderSubtotal
          : 1 / Number(line.order_lines);
      const net = round(Number(line.sales_settlement_amount) * weight);
      const gross = round(Number(line.sales_settlement_revenue) * weight);
      const qty = Number(line.sales_order_line_qty);
      const idProduct = line.id_product ? Number(line.id_product) : null;
      const hpp = idProduct ? round((costs.get(idProduct) ?? 0) * qty) : 0;
      if (!idProduct) unmappedQty += qty;
      hppTotal = round(hppTotal + hpp);
      const storeKey = Number(line.id_store);
      const storeBucket = byStore.get(storeKey) ?? {
        key: keyhsid.idStore.encode(storeKey),
        name: line.store_name,
        detail: line.business_entity_name,
        qty: 0,
        revenue: 0,
        amount: 0,
        hpp: 0,
        unmapped: false,
        orders: new Set<string>(),
      };
      storeBucket.orders.add(String(line.sales_settlement_order_ref));
      storeBucket.qty += qty;
      storeBucket.revenue = round(storeBucket.revenue + gross);
      storeBucket.amount = round(storeBucket.amount + net);
      storeBucket.hpp = round(storeBucket.hpp + hpp);
      storeBucket.unmapped = storeBucket.unmapped || !idProduct;
      byStore.set(storeKey, storeBucket);
      const productKey = idProduct
        ? `p${idProduct}`
        : `u:${line.sales_order_line_product_name}|${line.sales_order_line_variation}`;
      const productBucket = byProduct.get(productKey) ?? {
        key: idProduct ? keyhsid.idProduct.encode(idProduct) : productKey,
        name: idProduct
          ? (line.product_name ?? line.product_sku ?? '')
          : (line.sales_order_line_product_name ?? '(tanpa nama)'),
        detail: idProduct ? line.product_sku : line.sales_order_line_variation,
        qty: 0,
        revenue: 0,
        amount: 0,
        hpp: 0,
        unmapped: !idProduct,
      };
      productBucket.qty += qty;
      productBucket.revenue = round(productBucket.revenue + gross);
      productBucket.amount = round(productBucket.amount + net);
      productBucket.hpp = round(productBucket.hpp + hpp);
      byProduct.set(productKey, productBucket);
    }
    // The book rows of the period, per party and kind.
    const bookVisible = entityWhere(scope, 'e.id_business_entity');
    const [book] = await pool.query<RowDataPacket[]>(
      `SELECT e.id_business_entity, be.business_entity_name, e.ledger_entry_kind,
         SUM(e.ledger_entry_amount) AS amount
       FROM ledger_entry e
       INNER JOIN business_entity be ON be.id_business_entity = e.id_business_entity
       WHERE e.id_master_comp = ? ${bookVisible.sql} ${entity ? 'AND e.id_business_entity = ?' : ''}
         ${store ? 'AND e.id_store = ?' : ''} AND e.ledger_entry_kind != 'payment'
         ${from ? 'AND e.ledger_entry_date >= ?' : ''} ${to ? 'AND e.ledger_entry_date <= ?' : ''}
       GROUP BY e.id_business_entity, be.business_entity_name, e.ledger_entry_kind
       ORDER BY be.business_entity_name, e.ledger_entry_kind`,
      [
        scope.idMasterComp,
        ...bookVisible.params,
        ...(entity ? [entity] : []),
        ...(store ? [store.id_store] : []),
        ...(from ? [from] : []),
        ...(to ? [to] : []),
      ],
    );
    const parties = new Map<
      number,
      { id: string; name: string; share: number; fees: number; total: number }
    >();
    for (const row of book) {
      const id = Number(row.id_business_entity);
      const party = parties.get(id) ?? {
        id: keyhsid.idBusinessEntity.encode(id),
        name: row.business_entity_name,
        share: 0,
        fees: 0,
        total: 0,
      };
      const amount = money(row.amount);
      if (row.ledger_entry_kind === 'share') party.share = round(party.share + amount);
      else party.fees = round(party.fees + amount);
      party.total = round(party.total + amount);
      parties.set(id, party);
    }
    const amount = money(totals[0]?.amount);
    return sendSuccess(res, 200, 'MONEY_SUMMARY_FOUND', 'Dashboard loaded', {
      period: { from, to },
      orders: Number(totals[0]?.orders ?? 0),
      revenue: money(totals[0]?.revenue),
      fees: money(totals[0]?.fees),
      adjustments: money(totals[0]?.adjustments),
      amount,
      hpp: hppTotal,
      gross_profit: round(amount - hppTotal),
      unmapped_qty: unmappedQty,
      stores: [...byStore.values()].map(({ orders, ...bucket }) => ({
        ...bucket,
        orders: orders.size,
      })),
      products: [...byProduct.values()].sort((a, b) => b.amount - a.amount),
      parties: [...parties.values()],
    });
  },
);

/** The book: balances per party and counter party, then the rows of the period, newest first. */
router.get(
  '/api/v1/money/ledger',
  verifyToken,
  requirePermission('money.view'),
  onFailure('MONEY_LEDGER_FAILED', 'Unable to load the book'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const { from, to } = rangeOf(req.query as Record<string, unknown>);
    const entity = await entityOf(req, scope);
    const visible = entityWhere(scope, 'e.id_business_entity');
    const [balances] = await pool.query<RowDataPacket[]>(
      `SELECT e.id_business_entity, be.business_entity_name, e.id_counter_business_entity,
         ce.business_entity_name AS counter_name, SUM(e.ledger_entry_amount) AS balance,
         MAX(e.ledger_entry_date) AS last_date
       FROM ledger_entry e
       INNER JOIN business_entity be ON be.id_business_entity = e.id_business_entity
       INNER JOIN business_entity ce ON ce.id_business_entity = e.id_counter_business_entity
       WHERE e.id_master_comp = ? ${visible.sql} ${entity ? 'AND e.id_business_entity = ?' : ''}
       GROUP BY e.id_business_entity, be.business_entity_name, e.id_counter_business_entity, ce.business_entity_name
       ORDER BY be.business_entity_name, ce.business_entity_name`,
      [scope.idMasterComp, ...visible.params, ...(entity ? [entity] : [])],
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.id_ledger_entry, e.id_business_entity, be.business_entity_name,
         e.id_counter_business_entity, ce.business_entity_name AS counter_name, e.id_store, s.store_name,
         e.ledger_entry_kind, e.ledger_entry_date, e.ledger_entry_label, e.ledger_entry_amount,
         e.ledger_entry_note, e.created, a.alias AS created_by
       FROM ledger_entry e
       INNER JOIN business_entity be ON be.id_business_entity = e.id_business_entity
       INNER JOIN business_entity ce ON ce.id_business_entity = e.id_counter_business_entity
       LEFT JOIN store s ON s.id_store = e.id_store
       LEFT JOIN admin_acct a ON a.id_admin_acct = e.id_created_by
       WHERE e.id_master_comp = ? ${visible.sql} ${entity ? 'AND e.id_business_entity = ?' : ''}
         ${from ? 'AND e.ledger_entry_date >= ?' : ''} ${to ? 'AND e.ledger_entry_date <= ?' : ''}
       ORDER BY e.ledger_entry_date DESC, e.id_ledger_entry DESC LIMIT 300`,
      [
        scope.idMasterComp,
        ...visible.params,
        ...(entity ? [entity] : []),
        ...(from ? [from] : []),
        ...(to ? [to] : []),
      ],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idLedgerEntry.encode(row.id_ledger_entry),
      entity_id: keyhsid.idBusinessEntity.encode(row.id_business_entity),
      entity_name: row.business_entity_name,
      counter_id: keyhsid.idBusinessEntity.encode(row.id_counter_business_entity),
      counter_name: row.counter_name,
      store_name: row.store_name ?? null,
      kind: row.ledger_entry_kind,
      date: dateText(row.ledger_entry_date),
      label: row.ledger_entry_label,
      amount: money(row.ledger_entry_amount),
      note: row.ledger_entry_note,
      created: row.created,
      created_by: row.created_by,
    }));
    return sendList(res, 'MONEY_LEDGER_FOUND', 'Book loaded', data, {
      total: data.length,
      balances: balances.map((row) => ({
        entity_id: keyhsid.idBusinessEntity.encode(row.id_business_entity),
        entity_name: row.business_entity_name,
        counter_id: keyhsid.idBusinessEntity.encode(row.id_counter_business_entity),
        counter_name: row.counter_name,
        balance: money(row.balance),
        last_date: dateText(row.last_date),
      })),
    } as { total: number; balances: unknown[] });
  },
);

/** A payment between two parties, recorded after the money moved: payer_entity_id, payee_entity_id, date, amount, note. */
router.post(
  '/api/v1/money/payments',
  verifyToken,
  requirePermission('money.manage'),
  onFailure('MONEY_PAYMENT_FAILED', 'Unable to record the payment'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    const body = req.body ?? {};
    const payer = decodeId(body.payer_entity_id, keyhsid.idBusinessEntity);
    const payee = decodeId(body.payee_entity_id, keyhsid.idBusinessEntity);
    if (!payer || !payee || payer === payee) {
      return sendError(res, 400, 'MONEY_PAYMENT_PARTIES', 'Choose two different parties');
    }
    const date = isDate(body.date) ? body.date : null;
    if (!date) return sendError(res, 400, 'MONEY_PAYMENT_DATE', 'Check the date (YYYY-MM-DD)');
    const amount = round(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(res, 400, 'MONEY_PAYMENT_AMOUNT', 'The amount must be above zero');
    }
    const label = trimTo(body.label, 150) || 'Pembayaran';
    const note = nullableString(body.note);
    const ids = await withTransaction(pool, async (connection) => {
      const from = await loadEntity(connection, scope, payer);
      const to = await loadEntity(connection, scope, payee);
      // The payee was owed; the payer owed. Both balances move towards zero.
      const [insert] = await connection.query(
        `INSERT INTO ledger_entry (id_master_comp, id_business_entity, id_counter_business_entity,
           ledger_entry_kind, ledger_entry_date, ledger_entry_label, ledger_entry_amount,
           ledger_entry_note, id_created_by)
         VALUES ?`,
        [
          [
            [
              scope.idMasterComp,
              payee,
              payer,
              'payment',
              date,
              label,
              -amount,
              note,
              scope.idAdminAcct,
            ],
            [
              scope.idMasterComp,
              payer,
              payee,
              'payment',
              date,
              label,
              amount,
              note,
              scope.idAdminAcct,
            ],
          ],
        ],
      );
      const first = (insert as { insertId: number }).insertId;
      await auditSales(req, connection, scope, {
        eventCode: 'money.payment_recorded',
        action: 'create',
        entityType: 'ledger_entry',
        entityId: first,
        entityLabel: `${from.business_entity_name} -> ${to.business_entity_name}: ${amount}`,
        after: {
          payer: from.business_entity_name,
          payee: to.business_entity_name,
          date,
          amount,
          label,
          note,
        },
      });
      return [first, first + 1];
    });
    return sendSuccess(res, 201, 'MONEY_PAYMENT_RECORDED', 'Payment recorded', {
      ids: ids.map((id) => keyhsid.idLedgerEntry.encode(id)),
    });
  },
);

/** Re-posts the books of every settled order (of one store with ?store=), after rules or the SKU map changed. */
router.post(
  '/api/v1/money/rebuild',
  verifyToken,
  requirePermission('money.manage'),
  onFailure('MONEY_REBUILD_FAILED', 'Unable to rebuild the books'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    const store = await storeOf(pool, scope, req.body?.store ?? req.query.store, false);
    const added = await withTransaction(pool, async (connection) => {
      await platformEntityId(connection, scope.idMasterComp);
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id_sales_settlement FROM sales_settlement
         WHERE id_master_comp = ? AND sales_settlement_kind = 'order' ${store ? 'AND id_store = ?' : ''}
         ORDER BY id_sales_settlement`,
        [scope.idMasterComp, ...(store ? [store.id_store] : [])],
      );
      const ids = rows.map((row) => Number(row.id_sales_settlement));
      const count = await postSettlements(connection, scope, ids);
      await auditSales(req, connection, scope, {
        eventCode: 'money.books_rebuilt',
        action: 'update',
        entityType: 'ledger_entry',
        entityId: scope.idMasterComp,
        entityLabel: store ? store.store_name : 'all stores',
        after: { settlements: ids.length, rows_added: count },
      });
      return { settlements: ids.length, rows_added: count };
    });
    return sendSuccess(res, 200, 'MONEY_BOOKS_REBUILT', 'Books rebuilt', added);
  },
);

export default router;
