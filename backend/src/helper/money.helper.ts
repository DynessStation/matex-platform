import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

import { AdminScope } from './admin-scope.helper';
import { platformEntityId } from './business.helper';
import { loadCostItems } from './costing.helper';

// The book of each party. A settled order is split by the revenue share rule of the product's
// seller on that store: the components (platform fee, production fee, other) go to their
// receiver, and when the product belongs to another party than the store's owner, the rest is
// that party's share, owed by the store's owner. Posting is idempotent: rows already there for
// a settlement are summed per key and only the difference is added, so a changed import or a
// changed map yields a correction row and never rewrites history.

type Executor = Pick<Pool, 'query'> | PoolConnection;

export const LEDGER_KINDS = new Set([
  'share',
  'platform_fee',
  'production_fee',
  'other_fee',
  'payment',
]);

export interface RuleComponent {
  kind: string;
  label: string;
  type: string;
  value: number;
  base: string;
  receiver: number | null;
}

export interface ActiveRule {
  id: number;
  components: RuleComponent[];
}

/** The rule of an entity on a store (a store rule beats an entity rule) active on a date. */
export const ruleFor = async (
  executor: Executor,
  idMasterComp: number,
  idEntity: number,
  idStore: number,
  date: string,
): Promise<ActiveRule | null> => {
  const [rules] = await executor.query<RowDataPacket[]>(
    `SELECT id_revenue_share_rule, id_store FROM revenue_share_rule
     WHERE id_master_comp = ? AND id_business_entity = ? AND (id_store = ? OR id_store IS NULL)
       AND revenue_share_rule_from <= ? AND (revenue_share_rule_to IS NULL OR revenue_share_rule_to >= ?)
       AND revenue_share_rule_deleted_at IS NULL
     ORDER BY id_store IS NULL, revenue_share_rule_from DESC LIMIT 1`,
    [idMasterComp, idEntity, idStore, date, date],
  );
  const rule = rules[0];
  if (!rule) return null;
  const [components] = await executor.query<RowDataPacket[]>(
    `SELECT revenue_share_component_kind, revenue_share_component_label,
       revenue_share_component_type, revenue_share_component_value, revenue_share_component_base,
       id_receiver_business_entity
     FROM revenue_share_component WHERE id_revenue_share_rule = ?
     ORDER BY revenue_share_component_order, id_revenue_share_component`,
    [rule.id_revenue_share_rule],
  );
  return {
    id: Number(rule.id_revenue_share_rule),
    components: components.map((row) => ({
      kind: String(row.revenue_share_component_kind),
      label: String(row.revenue_share_component_label),
      type: String(row.revenue_share_component_type),
      value: Number(row.revenue_share_component_value),
      base: String(row.revenue_share_component_base),
      receiver: row.id_receiver_business_entity ? Number(row.id_receiver_business_entity) : null,
    })),
  };
};

/** HPP per product id, from the latest recipe of the cost item linked to it. */
export const productCosts = async (
  executor: Executor,
  idMasterComp: number,
): Promise<Map<number, number>> => {
  const items = await loadCostItems(executor, idMasterComp);
  const costs = new Map<number, number>();
  for (const item of items) {
    if (item.idProduct && item.hpp > 0 && !costs.has(item.idProduct)) {
      costs.set(item.idProduct, item.hpp);
    }
  }
  return costs;
};

const round = (value: number) => Math.round(value * 100) / 100;

/** What one component takes off a line: gross is the buyer's price, net the payout. */
export const componentAmount = (
  component: RuleComponent,
  line: { gross: number; net: number; qty: number; hpp: number },
): number => {
  if (component.type === 'percent') {
    const base = component.base === 'net' ? line.net : line.gross;
    return round((base * component.value) / 100);
  }
  if (component.type === 'fixed') return round(component.value * line.qty);
  // cost_plus: the item's HPP plus value percent, per piece.
  return round(line.hpp * line.qty * (1 + component.value / 100));
};

interface SettlementRow extends RowDataPacket {
  id_sales_settlement: number;
  id_master_comp: number;
  id_store: number;
  id_store_entity: number;
  sales_settlement_order_ref: string | null;
  sales_settlement_settled_at: Date | string | null;
  sales_settlement_order_at: Date | string | null;
  sales_settlement_amount: string;
  sales_settlement_revenue: string;
  sales_settlement_ref: string;
}

interface LineRow extends RowDataPacket {
  sales_order_line_qty: number;
  sales_order_line_subtotal: string;
  id_product: number | null;
  id_seller_business_entity: number | null;
}

interface Desired {
  entity: number;
  counter: number;
  kind: string;
  label: string;
  rule: number | null;
  amount: number;
}

const dateOnly = (value: Date | string | null): string | null => {
  if (!value) return null;
  return value instanceof Date
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    : String(value).slice(0, 10);
};

/** The rows a settled order should have produced, by party. */
const desiredRows = async (
  executor: Executor,
  settlement: SettlementRow,
  platform: number,
  costs: Map<number, number>,
): Promise<Desired[]> => {
  if (!settlement.sales_settlement_order_ref) return [];
  const date =
    dateOnly(settlement.sales_settlement_settled_at) ??
    dateOnly(settlement.sales_settlement_order_at);
  if (!date) return [];
  const [lines] = await executor.query<LineRow[]>(
    `SELECT l.sales_order_line_qty, l.sales_order_line_subtotal, m.id_product,
       p.id_seller_business_entity
     FROM sales_order o
     INNER JOIN sales_order_line l ON l.id_sales_order = o.id_sales_order
     LEFT JOIN store_sku_map m ON m.id_store = o.id_store AND m.store_sku_map_ref = l.sales_order_line_sku_ref
     LEFT JOIN product_catalog p ON p.id_product = m.id_product
     WHERE o.id_store = ? AND o.sales_order_ref = ?`,
    [settlement.id_store, settlement.sales_settlement_order_ref],
  );
  if (!lines.length) return [];
  const amount = Number(settlement.sales_settlement_amount);
  const revenue = Number(settlement.sales_settlement_revenue);
  const totalSubtotal = lines.reduce(
    (sum, line) => sum + Number(line.sales_order_line_subtotal),
    0,
  );
  const storeEntity = Number(settlement.id_store_entity);
  const rows = new Map<string, Desired>();
  const add = (row: Desired) => {
    if (row.amount === 0 || row.entity === row.counter) return;
    const key = `${row.entity}:${row.counter}:${row.kind}:${row.label}`;
    const known = rows.get(key);
    if (known) known.amount = round(known.amount + row.amount);
    else rows.set(key, { ...row });
  };
  const rulesByEntity = new Map<number, ActiveRule | null>();
  for (const line of lines) {
    const weight =
      totalSubtotal > 0 ? Number(line.sales_order_line_subtotal) / totalSubtotal : 1 / lines.length;
    const net = round(amount * weight);
    const gross = round(revenue * weight);
    const owner = line.id_seller_business_entity
      ? Number(line.id_seller_business_entity)
      : storeEntity;
    const qty = Number(line.sales_order_line_qty);
    const hpp = line.id_product ? (costs.get(Number(line.id_product)) ?? 0) : 0;
    if (!rulesByEntity.has(owner)) {
      rulesByEntity.set(
        owner,
        await ruleFor(executor, settlement.id_master_comp, owner, settlement.id_store, date),
      );
    }
    const rule = rulesByEntity.get(owner) ?? null;
    const ruleId = rule?.id ?? null;
    const taken = (rule?.components ?? [])
      .map((component) => ({
        component,
        receiver: component.receiver ?? platform,
        value: componentAmount(component, { gross, net, qty, hpp }),
      }))
      .filter((fee) => fee.value !== 0);
    if (owner === storeEntity) {
      // The owner has the payout; it owes each receiver its component.
      for (const fee of taken) {
        add({
          entity: owner,
          counter: fee.receiver,
          kind: fee.component.kind,
          label: fee.component.label,
          rule: ruleId,
          amount: -fee.value,
        });
        add({
          entity: fee.receiver,
          counter: owner,
          kind: fee.component.kind,
          label: fee.component.label,
          rule: ruleId,
          amount: fee.value,
        });
      }
      continue;
    }
    // Another party's product sold through this store: the store's owner holds the payout and
    // owes the owner its share (the payout less the components) and each receiver its component.
    add({
      entity: owner,
      counter: storeEntity,
      kind: 'share',
      label: 'Hak penjualan',
      rule: ruleId,
      amount: net,
    });
    add({
      entity: storeEntity,
      counter: owner,
      kind: 'share',
      label: 'Hak penjualan',
      rule: ruleId,
      amount: -net,
    });
    for (const fee of taken) {
      add({
        entity: owner,
        counter: storeEntity,
        kind: fee.component.kind,
        label: fee.component.label,
        rule: ruleId,
        amount: -fee.value,
      });
      add({
        entity: storeEntity,
        counter: owner,
        kind: fee.component.kind,
        label: fee.component.label,
        rule: ruleId,
        amount: fee.value,
      });
      if (fee.receiver !== storeEntity) {
        add({
          entity: storeEntity,
          counter: fee.receiver,
          kind: fee.component.kind,
          label: fee.component.label,
          rule: ruleId,
          amount: -fee.value,
        });
        add({
          entity: fee.receiver,
          counter: storeEntity,
          kind: fee.component.kind,
          label: fee.component.label,
          rule: ruleId,
          amount: fee.value,
        });
      }
    }
  }
  return [...rows.values()].filter((row) => row.amount !== 0);
};

/**
 * Posts (or re-posts) the book rows of the given settlements. Returns how many rows were added.
 * Existing rows of a settlement are summed per party, kind, and label; only the difference is
 * written, labelled as a correction when something was there before.
 */
export const postSettlements = async (
  connection: PoolConnection,
  scope: Pick<AdminScope, 'idMasterComp' | 'idAdminAcct'>,
  settlementIds: number[],
): Promise<number> => {
  if (!settlementIds.length) return 0;
  const platform = await platformEntityId(connection, scope.idMasterComp);
  const costs = await productCosts(connection, scope.idMasterComp);
  const [settlements] = await connection.query<SettlementRow[]>(
    `SELECT t.id_sales_settlement, t.id_master_comp, t.id_store, s.id_business_entity AS id_store_entity,
       t.sales_settlement_ref, t.sales_settlement_order_ref, t.sales_settlement_settled_at,
       t.sales_settlement_order_at, t.sales_settlement_amount, t.sales_settlement_revenue
     FROM sales_settlement t INNER JOIN store s ON s.id_store = t.id_store
     WHERE t.id_master_comp = ? AND t.id_sales_settlement IN (?) AND t.sales_settlement_kind = 'order'`,
    [scope.idMasterComp, settlementIds],
  );
  let added = 0;
  for (const settlement of settlements) {
    const desired = await desiredRows(connection, settlement, platform, costs);
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id_business_entity, id_counter_business_entity, ledger_entry_kind, ledger_entry_label,
         SUM(ledger_entry_amount) AS amount
       FROM ledger_entry WHERE id_sales_settlement = ?
       GROUP BY id_business_entity, id_counter_business_entity, ledger_entry_kind, ledger_entry_label`,
      [settlement.id_sales_settlement],
    );
    const have = new Map<string, number>();
    for (const row of existing) {
      have.set(
        `${row.id_business_entity}:${row.id_counter_business_entity}:${row.ledger_entry_kind}:${row.ledger_entry_label}`,
        Number(row.amount),
      );
    }
    const date =
      dateOnly(settlement.sales_settlement_settled_at) ??
      dateOnly(settlement.sales_settlement_order_at) ??
      new Date().toISOString().slice(0, 10);
    const inserts: unknown[][] = [];
    const keys = new Set<string>([...have.keys()]);
    for (const row of desired) keys.add(`${row.entity}:${row.counter}:${row.kind}:${row.label}`);
    for (const key of keys) {
      const want = desired.find(
        (row) => `${row.entity}:${row.counter}:${row.kind}:${row.label}` === key,
      );
      const current = have.get(key) ?? 0;
      const target = want?.amount ?? 0;
      const diff = round(target - current);
      if (Math.abs(diff) < 0.005) continue;
      const [entity, counter, kind, label] = key.split(':');
      inserts.push([
        scope.idMasterComp,
        Number(entity),
        Number(counter),
        settlement.id_store,
        settlement.id_sales_settlement,
        want?.rule ?? null,
        kind,
        date,
        current === 0 ? label : `Koreksi: ${label}`.slice(0, 150),
        diff,
        `Pesanan ${settlement.sales_settlement_order_ref ?? settlement.sales_settlement_ref}`,
        scope.idAdminAcct,
      ]);
    }
    if (inserts.length) {
      await connection.query(
        `INSERT INTO ledger_entry (id_master_comp, id_business_entity, id_counter_business_entity,
           id_store, id_sales_settlement, id_revenue_share_rule, ledger_entry_kind, ledger_entry_date,
           ledger_entry_label, ledger_entry_amount, ledger_entry_note, id_created_by)
         VALUES ?`,
        [inserts],
      );
      added += inserts.length;
    }
  }
  return added;
};
