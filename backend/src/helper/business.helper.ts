import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

import keyhsid from '../hsid';
import { AdminScope } from './admin-scope.helper';
import { writeAuditLog } from './audit-log.helper';
import { HttpError } from './http-error.helper';
import { AuthRequest } from '../middleware/auth-jwt.middleware';

// Shared pieces of the Bisnis module (entities, stores, revenue share rules). An account tied to
// an entity (scope.idBusinessEntity) only ever sees that entity: every query here adds that
// filter, so the restriction holds in SQL, not only in the menu.

type Executor = Pick<Pool, 'query'> | PoolConnection;

export const ENTITY_KINDS = new Set(['platform', 'own_brand', 'partner']);
export const COMPONENT_KINDS = new Set(['platform_fee', 'production_fee', 'other_fee']);
export const COMPONENT_TYPES = new Set(['percent', 'fixed', 'cost_plus']);
export const COMPONENT_BASES = new Set(['gross', 'net']);

export const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const dateText = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  return value instanceof Date
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    : String(value).slice(0, 10);
};

/** SQL and params that keep rows to the entities the account may see. */
export const entityWhere = (scope: AdminScope, column: string) =>
  scope.idBusinessEntity == null
    ? { sql: '', params: [] as number[] }
    : { sql: ` AND ${column} = ?`, params: [scope.idBusinessEntity] };

/** Products a partner's login may see: those it sells or makes. Empty for platform staff. */
export const productEntityWhere = (scope: AdminScope, prefix = '') =>
  scope.idBusinessEntity == null
    ? { sql: '', params: [] as number[] }
    : {
        sql: ` AND (${prefix}id_seller_business_entity = ? OR ${prefix}id_producer_business_entity = ?)`,
        params: [scope.idBusinessEntity, scope.idBusinessEntity],
      };

export const canSeeEntity = (scope: AdminScope, idBusinessEntity: number): boolean =>
  scope.idBusinessEntity == null || scope.idBusinessEntity === idBusinessEntity;

/** Platform staff only: a partner's login never changes the business set-up of others. */
export const assertPlatformStaff = (scope: AdminScope): void => {
  if (scope.idBusinessEntity != null) {
    throw new HttpError(403, 'BUSINESS_RESTRICTED', 'Your account is limited to one entity');
  }
};

export interface EntityRow extends RowDataPacket {
  id_business_entity: number;
  business_entity_kind: string;
  business_entity_name: string;
  business_entity_code: string;
  business_entity_contact_name: string | null;
  business_entity_contact_phone: string | null;
  business_entity_contact_email: string | null;
  business_entity_show_on_website: number;
  business_entity_note: string | null;
  business_entity_status: number;
}

export const ENTITY_COLUMNS = `id_business_entity, business_entity_kind, business_entity_name,
  business_entity_code, business_entity_contact_name, business_entity_contact_phone,
  business_entity_contact_email, business_entity_show_on_website, business_entity_note,
  business_entity_status, created, updated`;

/** The entity, visible to this account and not deleted, or a 404. `lock` adds FOR UPDATE. */
export const loadEntity = async (
  executor: Executor,
  scope: AdminScope,
  idBusinessEntity: number,
  lock = false,
): Promise<EntityRow> => {
  const visible = entityWhere(scope, 'id_business_entity');
  const [rows] = await executor.query<EntityRow[]>(
    `SELECT ${ENTITY_COLUMNS} FROM business_entity
     WHERE id_business_entity = ? AND id_master_comp = ? AND business_entity_deleted_at IS NULL
       ${visible.sql} LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`,
    [idBusinessEntity, scope.idMasterComp, ...visible.params],
  );
  const entity = rows[0];
  if (!entity) throw new HttpError(404, 'BUSINESS_ENTITY_NOT_FOUND', 'Entity not found');
  return entity;
};

const PLATFORM_SELECT = `SELECT id_business_entity FROM business_entity
     WHERE id_master_comp = ? AND business_entity_kind = 'platform'
       AND business_entity_deleted_at IS NULL
     ORDER BY id_business_entity LIMIT 1`;

/**
 * The company's own entity (kind platform). Migration 034 seeds one per company; a company
 * made after it (a fresh test database) gets its entity here, named after the company.
 */
export const platformEntityId = async (
  executor: Executor,
  idMasterComp: number,
): Promise<number> => {
  const [rows] = await executor.query<RowDataPacket[]>(PLATFORM_SELECT, [idMasterComp]);
  const id = Number(rows[0]?.id_business_entity);
  if (id) return id;
  await executor.query(
    `INSERT INTO business_entity
       (id_master_comp, business_entity_kind, business_entity_name, business_entity_code)
     SELECT mc.id_master_comp, 'platform', mc.comp_name,
       COALESCE(NULLIF(UPPER(LEFT(REGEXP_REPLACE(mc.comp_alias, '[^A-Za-z0-9]', ''), 30)), ''),
         CONCAT('ENT', mc.id_master_comp))
     FROM master_comp mc
     WHERE mc.id_master_comp = ?
       AND NOT EXISTS (
         SELECT 1 FROM business_entity be
         WHERE be.id_master_comp = mc.id_master_comp AND be.business_entity_kind = 'platform'
       )`,
    [idMasterComp],
  );
  const [created] = await executor.query<RowDataPacket[]>(PLATFORM_SELECT, [idMasterComp]);
  const createdId = Number(created[0]?.id_business_entity);
  if (!createdId)
    throw new HttpError(500, 'BUSINESS_PLATFORM_MISSING', 'The platform entity is missing');
  return createdId;
};

/** An entity id from a request value: the platform entity when empty, 400 when unknown. */
export const resolveEntityId = async (
  executor: Executor,
  scope: AdminScope,
  value: unknown,
  field: string,
): Promise<number> => {
  if (value == null || value === '') {
    if (scope.idBusinessEntity != null) return scope.idBusinessEntity;
    return platformEntityId(executor, scope.idMasterComp);
  }
  const id = typeof value === 'string' ? Number(keyhsid.idBusinessEntity.decode(value)[0]) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'BUSINESS_ENTITY_INVALID', `Check ${field}`);
  }
  try {
    await loadEntity(executor, scope, id);
  } catch {
    throw new HttpError(400, 'BUSINESS_ENTITY_INVALID', `Check ${field}`);
  }
  return id;
};

export const entityDto = (row: EntityRow, extra: Record<string, unknown> = {}) => ({
  id: keyhsid.idBusinessEntity.encode(row.id_business_entity),
  kind: row.business_entity_kind,
  name: row.business_entity_name,
  code: row.business_entity_code,
  contact_name: row.business_entity_contact_name,
  contact_phone: row.business_entity_contact_phone,
  contact_email: row.business_entity_contact_email,
  show_on_website: Number(row.business_entity_show_on_website) === 1,
  note: row.business_entity_note,
  status: Number(row.business_entity_status) === 1,
  created: row.created,
  updated: row.updated,
  ...extra,
});

export const auditBusiness = (
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
    metadata?: Record<string, unknown>;
  },
) =>
  writeAuditLog({
    req,
    connection,
    writeMode: 'strict',
    idMasterComp: scope.idMasterComp,
    category: 'data_change',
    module: 'business',
    actorType: 'admin',
    actorId: scope.idAdminAcct,
    actorLabel: req.user?.alias ?? null,
    httpStatus: 200,
    ...entry,
  });
