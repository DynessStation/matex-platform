// Revenue share rules: who gets what from an entity's sales. One case, one dated rule; the
// components come off a sale in order and the rest is the entity's share. Partner logins read
// their rules but never change them.
import express = require('express');
import { Response } from 'express';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import {
  COMPONENT_BASES,
  COMPONENT_KINDS,
  COMPONENT_TYPES,
  assertPlatformStaff,
  auditBusiness,
  dateText,
  entityWhere,
  isDate,
  loadEntity,
} from '../../../helper/business.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { nullableString, trimTo } from '../../../helper/input.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import type { RequestBody } from '../../../helper/input.helper';

const router = express.Router();
const { pool } = db;

const MAX_COMPONENTS = 10;

const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

interface RuleRow extends RowDataPacket {
  id_revenue_share_rule: number;
  id_business_entity: number;
  business_entity_name: string;
  id_store: number | null;
  store_name: string | null;
  revenue_share_rule_name: string;
  revenue_share_rule_from: Date | string;
  revenue_share_rule_to: Date | string | null;
  revenue_share_rule_note: string | null;
}

interface ComponentRow extends RowDataPacket {
  id_revenue_share_rule: number;
  revenue_share_component_kind: string;
  revenue_share_component_label: string;
  revenue_share_component_type: string;
  revenue_share_component_value: string | number;
  revenue_share_component_base: string;
  id_receiver_business_entity: number | null;
}

interface ComponentInput {
  kind: string;
  label: string;
  type: string;
  value: number;
  base: string;
  receiverEntityId: number | null;
}

interface RuleInput {
  name: string;
  idStore: number | null;
  from: string;
  to: string | null;
  note: string | null;
  components: ComponentInput[];
}

const RULE_SELECT = `SELECT r.id_revenue_share_rule, r.id_business_entity, be.business_entity_name,
    r.id_store, s.store_name, r.revenue_share_rule_name, r.revenue_share_rule_from,
    r.revenue_share_rule_to, r.revenue_share_rule_note, r.created, r.updated
  FROM revenue_share_rule r
  INNER JOIN business_entity be ON be.id_business_entity = r.id_business_entity
  LEFT JOIN store s ON s.id_store = r.id_store`;

const componentDto = (row: ComponentRow) => ({
  kind: row.revenue_share_component_kind,
  label: row.revenue_share_component_label,
  type: row.revenue_share_component_type,
  value: Number(row.revenue_share_component_value),
  base: row.revenue_share_component_base,
  receiver_entity_id: row.id_receiver_business_entity
    ? keyhsid.idBusinessEntity.encode(row.id_receiver_business_entity)
    : null,
});

const ruleDto = (row: RuleRow, components: ComponentRow[]) => ({
  id: keyhsid.idRevenueShareRule.encode(row.id_revenue_share_rule),
  entity_id: keyhsid.idBusinessEntity.encode(row.id_business_entity),
  entity_name: row.business_entity_name,
  store_id: row.id_store ? keyhsid.idStore.encode(row.id_store) : null,
  store_name: row.store_name,
  name: row.revenue_share_rule_name,
  from: dateText(row.revenue_share_rule_from),
  to: dateText(row.revenue_share_rule_to),
  note: row.revenue_share_rule_note,
  components: components.map(componentDto),
  created: row.created,
  updated: row.updated,
});

const componentsOf = async (
  executor: Pick<PoolConnection, 'query'>,
  ruleIds: number[],
): Promise<Map<number, ComponentRow[]>> => {
  const byRule = new Map<number, ComponentRow[]>();
  if (!ruleIds.length) return byRule;
  const [rows] = await executor.query<ComponentRow[]>(
    `SELECT id_revenue_share_rule, revenue_share_component_kind, revenue_share_component_label,
       revenue_share_component_type, revenue_share_component_value, revenue_share_component_base,
       id_receiver_business_entity
     FROM revenue_share_component
     WHERE id_revenue_share_rule IN (?)
     ORDER BY id_revenue_share_rule, revenue_share_component_order, id_revenue_share_component`,
    [ruleIds],
  );
  for (const row of rows) {
    const list = byRule.get(row.id_revenue_share_rule) ?? [];
    list.push(row);
    byRule.set(row.id_revenue_share_rule, list);
  }
  return byRule;
};

const readComponents = (value: unknown): ComponentInput[] => {
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'REVENUE_SHARE_COMPONENTS_INVALID', 'Check the components');
  }
  if (value.length > MAX_COMPONENTS) {
    throw new HttpError(
      400,
      'REVENUE_SHARE_TOO_MANY_COMPONENTS',
      `At most ${MAX_COMPONENTS} components`,
    );
  }
  const percentByBase = new Map<string, number>();
  const components = value.map((raw: Record<string, unknown>, index) => {
    const kind = String(raw?.kind ?? '');
    const type = String(raw?.type ?? 'percent');
    const base = String(raw?.base ?? 'gross');
    const label = trimTo(raw?.label, 100);
    const amount = Number(raw?.value);
    const position = `component ${index + 1}`;
    if (!COMPONENT_KINDS.has(kind) || !COMPONENT_TYPES.has(type) || !COMPONENT_BASES.has(base)) {
      throw new HttpError(400, 'REVENUE_SHARE_COMPONENTS_INVALID', `Check ${position}`);
    }
    if (!label) {
      throw new HttpError(400, 'REVENUE_SHARE_COMPONENT_LABEL_REQUIRED', `Name ${position}`);
    }
    if (!Number.isFinite(amount) || amount < 0 || (type === 'percent' && amount >= 100)) {
      throw new HttpError(
        400,
        'REVENUE_SHARE_COMPONENT_VALUE_INVALID',
        `Check the value of ${position}`,
      );
    }
    if (type === 'percent') {
      const sum = (percentByBase.get(base) ?? 0) + amount;
      if (sum >= 100) {
        throw new HttpError(
          400,
          'REVENUE_SHARE_PERCENT_TOO_HIGH',
          'The percentages leave nothing for the entity',
        );
      }
      percentByBase.set(base, sum);
    }
    const receiver = raw?.receiver_entity_id;
    const receiverEntityId =
      typeof receiver === 'string' && receiver
        ? decodeId(receiver, keyhsid.idBusinessEntity)
        : null;
    if (typeof receiver === 'string' && receiver && !receiverEntityId) {
      throw new HttpError(
        400,
        'REVENUE_SHARE_COMPONENTS_INVALID',
        `Check the receiver of ${position}`,
      );
    }
    return { kind, label, type, value: Math.round(amount * 10000) / 10000, base, receiverEntityId };
  });
  return components;
};

const readRuleInput = async (
  connection: PoolConnection,
  scope: AdminScope,
  idEntity: number,
  body: RequestBody,
): Promise<RuleInput> => {
  const name = trimTo(body?.name, 150);
  if (!name) throw new HttpError(400, 'REVENUE_SHARE_NAME_REQUIRED', 'Rule name is required');
  if (!isDate(body?.from))
    throw new HttpError(400, 'REVENUE_SHARE_FROM_INVALID', 'Check the start date');
  const to = body?.to == null || body.to === '' ? null : body.to;
  if (to !== null && (!isDate(to) || to < body.from)) {
    throw new HttpError(
      400,
      'REVENUE_SHARE_TO_INVALID',
      'The end date must not come before the start',
    );
  }
  let idStore: number | null = null;
  if (body?.store_id != null && body.store_id !== '') {
    idStore = typeof body.store_id === 'string' ? decodeId(body.store_id, keyhsid.idStore) : null;
    const [stores] = idStore
      ? await connection.query<RowDataPacket[]>(
          // The entity's own store, or another party's store its products are listed in.
          `SELECT 1 FROM store WHERE id_store = ? AND id_master_comp = ?
             AND store_deleted_at IS NULL LIMIT 1`,
          [idStore, scope.idMasterComp],
        )
      : [[] as RowDataPacket[]];
    if (!stores.length) {
      throw new HttpError(400, 'REVENUE_SHARE_STORE_INVALID', 'Store not found');
    }
  }
  const components = readComponents(body?.components ?? []);
  for (const component of components) {
    if (component.receiverEntityId) await loadEntity(connection, scope, component.receiverEntityId);
  }
  return { name, idStore, from: body.from, to, note: nullableString(body?.note), components };
};

/** Two rules for the same entity and store (or both for the whole entity) must not overlap. */
const assertNoOverlap = async (
  connection: PoolConnection,
  idEntity: number,
  input: RuleInput,
  excludeId?: number,
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT revenue_share_rule_name FROM revenue_share_rule
     WHERE id_business_entity = ? AND revenue_share_rule_deleted_at IS NULL
       AND ${input.idStore ? 'id_store = ?' : 'id_store IS NULL'}
       AND revenue_share_rule_from <= ?
       AND (revenue_share_rule_to IS NULL OR revenue_share_rule_to >= ?)
       ${excludeId ? 'AND id_revenue_share_rule != ?' : ''}
     LIMIT 1`,
    [
      idEntity,
      ...(input.idStore ? [input.idStore] : []),
      input.to ?? '9999-12-31',
      input.from,
      ...(excludeId ? [excludeId] : []),
    ],
  );
  if (rows.length) {
    throw new HttpError(
      409,
      'REVENUE_SHARE_RULE_OVERLAPS',
      'Another rule already covers those dates',
      {
        rule: rows[0].revenue_share_rule_name,
      },
    );
  }
};

const writeComponents = async (
  connection: PoolConnection,
  idRule: number,
  components: ComponentInput[],
) => {
  await connection.query('DELETE FROM revenue_share_component WHERE id_revenue_share_rule = ?', [
    idRule,
  ]);
  if (!components.length) return;
  await connection.query(
    `INSERT INTO revenue_share_component (id_revenue_share_rule, revenue_share_component_order,
       revenue_share_component_kind, revenue_share_component_label, revenue_share_component_type,
       revenue_share_component_value, revenue_share_component_base, id_receiver_business_entity)
     VALUES ?`,
    [
      components.map((component, index) => [
        idRule,
        index,
        component.kind,
        component.label,
        component.type,
        component.value,
        component.base,
        component.receiverEntityId,
      ]),
    ],
  );
};

const auditFields = (input: RuleInput) => ({
  name: input.name,
  store_id: input.idStore,
  from: input.from,
  to: input.to,
  note: input.note,
  components: input.components.map((component) => ({
    kind: component.kind,
    label: component.label,
    type: component.type,
    value: component.value,
    base: component.base,
  })),
});

const loadRule = async (
  connection: PoolConnection,
  scope: AdminScope,
  idRule: number,
): Promise<RuleRow> => {
  const visible = entityWhere(scope, 'r.id_business_entity');
  const [rows] = await connection.query<RuleRow[]>(
    `${RULE_SELECT}
     WHERE r.id_revenue_share_rule = ? AND r.id_master_comp = ?
       AND r.revenue_share_rule_deleted_at IS NULL ${visible.sql}
     LIMIT 1 FOR UPDATE`,
    [idRule, scope.idMasterComp, ...visible.params],
  );
  const rule = rows[0];
  if (!rule) throw new HttpError(404, 'REVENUE_SHARE_RULE_NOT_FOUND', 'Rule not found');
  return rule;
};

/** Every rule the account may see, optionally of one entity (?entity=), newest first. */
router.get(
  '/api/v1/business/rules',
  verifyToken,
  requirePermission('business.view'),
  onFailure('BUSINESS_RULES_FAILED', 'Unable to load the rules'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const visible = entityWhere(scope, 'r.id_business_entity');
    const entity =
      typeof req.query.entity === 'string'
        ? decodeId(req.query.entity, keyhsid.idBusinessEntity)
        : null;
    if (req.query.entity !== undefined && !entity) {
      return sendError(res, 400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');
    }
    const [rows] = await pool.query<RuleRow[]>(
      `${RULE_SELECT}
       WHERE r.id_master_comp = ? AND r.revenue_share_rule_deleted_at IS NULL ${visible.sql}
         ${entity ? 'AND r.id_business_entity = ?' : ''}
       ORDER BY be.business_entity_name, r.id_store IS NULL DESC, r.revenue_share_rule_from DESC`,
      [scope.idMasterComp, ...visible.params, ...(entity ? [entity] : [])],
    );
    const components = await componentsOf(
      pool,
      rows.map((row) => row.id_revenue_share_rule),
    );
    const data = rows.map((row) => ruleDto(row, components.get(row.id_revenue_share_rule) ?? []));
    return sendList(res, 'BUSINESS_RULES_FOUND', 'Rules loaded', data, { total: data.length });
  },
);

router.post(
  '/api/v1/business/entities/:id/rules',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('REVENUE_SHARE_SAVE_FAILED', 'Unable to save the rule'),
  async (req: AuthRequest, res: Response) => {
    const idEntity = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!idEntity)
      return sendError(res, 400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    const id = await withTransaction(pool, async (connection) => {
      const entity = await loadEntity(connection, scope, idEntity, true);
      if (entity.business_entity_kind === 'platform') {
        throw new HttpError(
          409,
          'BUSINESS_ENTITY_IS_PLATFORM',
          'The platform shares nothing with itself',
        );
      }
      const input = await readRuleInput(connection, scope, idEntity, req.body);
      await assertNoOverlap(connection, idEntity, input);
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO revenue_share_rule (id_master_comp, id_business_entity, id_store,
           revenue_share_rule_name, revenue_share_rule_from, revenue_share_rule_to,
           revenue_share_rule_note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [scope.idMasterComp, idEntity, input.idStore, input.name, input.from, input.to, input.note],
      );
      const created = Number(insert.insertId);
      await writeComponents(connection, created, input.components);
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.rule_created',
        action: 'create',
        entityType: 'revenue_share_rule',
        entityId: created,
        entityLabel: `${entity.business_entity_name}: ${input.name}`,
        after: auditFields(input),
      });
      return created;
    });
    return sendSuccess(res, 201, 'REVENUE_SHARE_RULE_CREATED', 'Rule created', {
      id: keyhsid.idRevenueShareRule.encode(id),
    });
  },
);

router.put(
  '/api/v1/business/rules/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('REVENUE_SHARE_SAVE_FAILED', 'Unable to save the rule'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idRevenueShareRule);
    if (!id) return sendError(res, 400, 'REVENUE_SHARE_INVALID_ID', 'Invalid rule identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    await withTransaction(pool, async (connection) => {
      const current = await loadRule(connection, scope, id);
      const input = await readRuleInput(connection, scope, current.id_business_entity, req.body);
      await assertNoOverlap(connection, current.id_business_entity, input, id);
      const before = (await componentsOf(connection, [id])).get(id) ?? [];
      await connection.query(
        `UPDATE revenue_share_rule SET id_store = ?, revenue_share_rule_name = ?,
           revenue_share_rule_from = ?, revenue_share_rule_to = ?, revenue_share_rule_note = ?,
           updated = NOW()
         WHERE id_revenue_share_rule = ? AND id_master_comp = ?`,
        [input.idStore, input.name, input.from, input.to, input.note, id, scope.idMasterComp],
      );
      await writeComponents(connection, id, input.components);
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.rule_updated',
        action: 'update',
        entityType: 'revenue_share_rule',
        entityId: id,
        entityLabel: `${current.business_entity_name}: ${input.name}`,
        before: {
          name: current.revenue_share_rule_name,
          store_id: current.id_store,
          from: dateText(current.revenue_share_rule_from),
          to: dateText(current.revenue_share_rule_to),
          note: current.revenue_share_rule_note,
          components: before.map(componentDto),
        },
        after: auditFields(input),
      });
    });
    return sendSuccess(res, 200, 'REVENUE_SHARE_RULE_UPDATED', 'Rule updated', {
      id: keyhsid.idRevenueShareRule.encode(id),
    });
  },
);

router.delete(
  '/api/v1/business/rules/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('REVENUE_SHARE_DELETE_FAILED', 'Unable to delete the rule'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idRevenueShareRule);
    if (!id) return sendError(res, 400, 'REVENUE_SHARE_INVALID_ID', 'Invalid rule identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    await withTransaction(pool, async (connection) => {
      const current = await loadRule(connection, scope, id);
      await connection.query(
        `UPDATE revenue_share_rule SET revenue_share_rule_deleted_at = NOW(), updated = NOW()
         WHERE id_revenue_share_rule = ? AND id_master_comp = ?`,
        [id, scope.idMasterComp],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.rule_deleted',
        action: 'delete',
        entityType: 'revenue_share_rule',
        entityId: id,
        entityLabel: `${current.business_entity_name}: ${current.revenue_share_rule_name}`,
        metadata: { delete_type: 'soft_delete' },
      });
    });
    return sendSuccess(res, 200, 'REVENUE_SHARE_RULE_DELETED', 'Rule deleted', {
      id: keyhsid.idRevenueShareRule.encode(id),
    });
  },
);

export default router;
