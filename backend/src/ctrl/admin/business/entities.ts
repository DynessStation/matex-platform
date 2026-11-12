// The parties of the business: the platform (MIA), its own brands, and B2B partners.
import express = require('express');
import { Response } from 'express';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import {
  ENTITY_COLUMNS,
  ENTITY_KINDS,
  EntityRow,
  assertPlatformStaff,
  auditBusiness,
  entityDto,
  entityWhere,
  loadEntity,
  platformEntityId,
} from '../../../helper/business.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { isValidEmail, nullableString, toFlag, trimTo } from '../../../helper/input.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import type { RequestBody } from '../../../helper/input.helper';

const router = express.Router();
const { pool } = db;

const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

const invalidId = (res: Response) =>
  sendError(res, 400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');

const codeFromName = (name: string) =>
  name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 8) || 'ENT';

interface EntityInput {
  kind: string;
  name: string;
  code: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  showOnWebsite: 0 | 1;
  note: string | null;
}

const readEntityInput = (body: RequestBody, current?: EntityRow): EntityInput => {
  const name = trimTo(body?.name, 150);
  if (!name) throw new HttpError(400, 'BUSINESS_ENTITY_NAME_REQUIRED', 'Entity name is required');
  const kind =
    typeof body?.kind === 'string' ? body.kind : (current?.business_entity_kind ?? 'own_brand');
  if (
    !ENTITY_KINDS.has(kind) ||
    (kind === 'platform' && current?.business_entity_kind !== 'platform')
  ) {
    throw new HttpError(400, 'BUSINESS_ENTITY_KIND_INVALID', 'Check the entity kind');
  }
  if (current?.business_entity_kind === 'platform' && kind !== 'platform') {
    throw new HttpError(409, 'BUSINESS_ENTITY_IS_PLATFORM', 'The platform entity keeps its kind');
  }
  const rawCode = trimTo(body?.code, 30)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
  const code = rawCode || current?.business_entity_code || codeFromName(name);
  const contactEmail = nullableString(body?.contact_email);
  if (contactEmail && !isValidEmail(contactEmail)) {
    throw new HttpError(400, 'BUSINESS_ENTITY_EMAIL_INVALID', 'Check the contact email');
  }
  const contactPhone = nullableString(body?.contact_phone);
  if (contactPhone && !/^\+?\d{6,20}$/.test(contactPhone)) {
    throw new HttpError(400, 'BUSINESS_ENTITY_PHONE_INVALID', 'Check the contact phone');
  }
  return {
    kind,
    name,
    code,
    contactName: nullableString(body?.contact_name)?.slice(0, 150) ?? null,
    contactPhone,
    contactEmail: contactEmail?.slice(0, 255) ?? null,
    showOnWebsite: toFlag(
      body?.show_on_website,
      current ? (Number(current.business_entity_show_on_website) as 0 | 1) : 0,
    ),
    note: nullableString(body?.note),
  };
};

const assertUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  input: EntityInput,
  excludeId?: number,
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT business_entity_name, business_entity_code FROM business_entity
     WHERE id_master_comp = ? AND business_entity_deleted_at IS NULL
       AND (LOWER(business_entity_name) = LOWER(?) OR business_entity_code = ?)
       ${excludeId ? 'AND id_business_entity != ?' : ''}
     LIMIT 1`,
    excludeId
      ? [idMasterComp, input.name, input.code, excludeId]
      : [idMasterComp, input.name, input.code],
  );
  const clash = rows[0];
  if (!clash) return;
  if (clash.business_entity_code === input.code) {
    throw new HttpError(409, 'BUSINESS_ENTITY_CODE_TAKEN', 'Entity code is already in use');
  }
  throw new HttpError(409, 'BUSINESS_ENTITY_EXISTS', 'Entity name is already in use');
};

const auditFields = (row: EntityRow) => ({
  kind: row.business_entity_kind,
  name: row.business_entity_name,
  code: row.business_entity_code,
  contact_name: row.business_entity_contact_name,
  contact_phone: row.business_entity_contact_phone,
  contact_email: row.business_entity_contact_email,
  show_on_website: Number(row.business_entity_show_on_website),
  note: row.business_entity_note,
  status: Number(row.business_entity_status),
});

const inputFields = (input: EntityInput, status: number) => ({
  kind: input.kind,
  name: input.name,
  code: input.code,
  contact_name: input.contactName,
  contact_phone: input.contactPhone,
  contact_email: input.contactEmail,
  show_on_website: input.showOnWebsite,
  note: input.note,
  status,
});

/** How many stores, products, and accounts hang on each entity. */
const countsOf = async (idMasterComp: number, ids: number[]) => {
  const counts = new Map<number, { stores: number; products: number; accounts: number }>();
  if (!ids.length) return counts;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT be.id_business_entity,
       (SELECT COUNT(*) FROM store s
        WHERE s.id_business_entity = be.id_business_entity AND s.store_deleted_at IS NULL) AS stores,
       (SELECT COUNT(*) FROM product_catalog p
        WHERE (p.id_seller_business_entity = be.id_business_entity
          OR p.id_producer_business_entity = be.id_business_entity)
          AND p.product_deleted_at IS NULL) AS products,
       (SELECT COUNT(*) FROM admin_acct a
        WHERE a.id_business_entity = be.id_business_entity AND a.admin_acct_deleted_at IS NULL) AS accounts
     FROM business_entity be
     WHERE be.id_master_comp = ? AND be.id_business_entity IN (?)`,
    [idMasterComp, ids],
  );
  for (const row of rows) {
    counts.set(row.id_business_entity, {
      stores: Number(row.stores),
      products: Number(row.products),
      accounts: Number(row.accounts),
    });
  }
  return counts;
};

//==================================================
//==== LIST / OPTIONS / READ
//==================================================

router.get(
  '/api/v1/business/entities',
  verifyToken,
  requirePermission('business.view'),
  onFailure('BUSINESS_ENTITIES_FAILED', 'Unable to load the entities'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await platformEntityId(pool, scope.idMasterComp);
    const visible = entityWhere(scope, 'id_business_entity');
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const [rows] = await pool.query<EntityRow[]>(
      `SELECT ${ENTITY_COLUMNS} FROM business_entity
       WHERE id_master_comp = ? AND business_entity_deleted_at IS NULL ${visible.sql}
         ${search ? 'AND (business_entity_name LIKE ? OR business_entity_code LIKE ?)' : ''}
       ORDER BY FIELD(business_entity_kind, 'platform', 'own_brand', 'partner'), business_entity_name`,
      [scope.idMasterComp, ...visible.params, ...(search ? [`%${search}%`, `%${search}%`] : [])],
    );
    const counts = await countsOf(
      scope.idMasterComp,
      rows.map((row) => row.id_business_entity),
    );
    const data = rows.map((row) => {
      const count = counts.get(row.id_business_entity) ?? { stores: 0, products: 0, accounts: 0 };
      return entityDto(row, {
        store_count: count.stores,
        product_count: count.products,
        account_count: count.accounts,
      });
    });
    return sendList(res, 'BUSINESS_ENTITIES_FOUND', 'Entities loaded', data, {
      total: data.length,
    });
  },
);

/** Value/label pairs for selects (product seller and producer, account entity). */
router.get(
  '/api/v1/business/entities/options',
  verifyToken,
  onFailure('BUSINESS_ENTITIES_FAILED', 'Unable to load the entities'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await platformEntityId(pool, scope.idMasterComp);
    const visible = entityWhere(scope, 'id_business_entity');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_business_entity, business_entity_name, business_entity_kind
       FROM business_entity
       WHERE id_master_comp = ? AND business_entity_deleted_at IS NULL
         AND business_entity_status = 1 ${visible.sql}
       ORDER BY FIELD(business_entity_kind, 'platform', 'own_brand', 'partner'), business_entity_name`,
      [scope.idMasterComp, ...visible.params],
    );
    const data = rows.map((row) => ({
      value: keyhsid.idBusinessEntity.encode(row.id_business_entity),
      label: row.business_entity_name,
      kind: row.business_entity_kind,
    }));
    return sendList(res, 'BUSINESS_ENTITY_OPTIONS_FOUND', 'Entities loaded', data, {
      total: data.length,
    });
  },
);

router.get(
  '/api/v1/business/entities/:id',
  verifyToken,
  requirePermission('business.view'),
  onFailure('BUSINESS_ENTITIES_FAILED', 'Unable to load the entity'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!id) return invalidId(res);
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const entity = await loadEntity(pool, scope, id);
    const count = (await countsOf(scope.idMasterComp, [id])).get(id);
    return sendSuccess(
      res,
      200,
      'BUSINESS_ENTITY_FOUND',
      'Entity loaded',
      entityDto(entity, {
        store_count: count?.stores ?? 0,
        product_count: count?.products ?? 0,
        account_count: count?.accounts ?? 0,
      }),
    );
  },
);

//==================================================
//==== CREATE / UPDATE
//==================================================

router.post(
  '/api/v1/business/entities',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('BUSINESS_ENTITY_SAVE_FAILED', 'Unable to save the entity'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    const input = readEntityInput(req.body);
    const id = await withTransaction(pool, async (connection) => {
      await assertUnique(connection, scope.idMasterComp, input);
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO business_entity (id_master_comp, business_entity_kind, business_entity_name,
           business_entity_code, business_entity_contact_name, business_entity_contact_phone,
           business_entity_contact_email, business_entity_show_on_website, business_entity_note,
           business_entity_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          scope.idMasterComp,
          input.kind,
          input.name,
          input.code,
          input.contactName,
          input.contactPhone,
          input.contactEmail,
          input.showOnWebsite,
          input.note,
        ],
      );
      const created = Number(insert.insertId);
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.entity_created',
        action: 'create',
        entityType: 'business_entity',
        entityId: created,
        entityLabel: input.name,
        after: inputFields(input, 1),
      });
      return created;
    });
    return sendSuccess(res, 201, 'BUSINESS_ENTITY_CREATED', 'Entity created', {
      id: keyhsid.idBusinessEntity.encode(id),
    });
  },
);

router.put(
  '/api/v1/business/entities/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('BUSINESS_ENTITY_SAVE_FAILED', 'Unable to save the entity'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!id) return invalidId(res);
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await withTransaction(pool, async (connection) => {
      const current = await loadEntity(connection, scope, id, true);
      const input = readEntityInput(req.body, current);
      // A partner's login may keep its own contact details up to date, nothing more.
      if (
        scope.idBusinessEntity != null &&
        (input.kind !== current.business_entity_kind ||
          input.name !== current.business_entity_name ||
          input.code !== current.business_entity_code ||
          input.showOnWebsite !== Number(current.business_entity_show_on_website))
      ) {
        throw new HttpError(403, 'BUSINESS_RESTRICTED', 'Your account is limited to one entity');
      }
      await assertUnique(connection, scope.idMasterComp, input, id);
      const before = auditFields(current);
      const after = inputFields(input, before.status);
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      await connection.query(
        `UPDATE business_entity SET business_entity_kind = ?, business_entity_name = ?,
           business_entity_code = ?, business_entity_contact_name = ?,
           business_entity_contact_phone = ?, business_entity_contact_email = ?,
           business_entity_show_on_website = ?, business_entity_note = ?, updated = NOW()
         WHERE id_business_entity = ? AND id_master_comp = ?`,
        [
          input.kind,
          input.name,
          input.code,
          input.contactName,
          input.contactPhone,
          input.contactEmail,
          input.showOnWebsite,
          input.note,
          id,
          scope.idMasterComp,
        ],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.entity_updated',
        action: 'update',
        entityType: 'business_entity',
        entityId: id,
        entityLabel: input.name,
        before,
        after,
      });
    });
    return sendSuccess(res, 200, 'BUSINESS_ENTITY_UPDATED', 'Entity updated', {
      id: keyhsid.idBusinessEntity.encode(id),
    });
  },
);

//==================================================
//==== STATUS / DELETE
//==================================================

router.patch(
  '/api/v1/business/entities/:id/status',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('BUSINESS_ENTITY_SAVE_FAILED', 'Unable to change the entity status'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!id) return invalidId(res);
    const status = Number(
      req.body?.status === true ? 1 : req.body?.status === false ? 0 : req.body?.status,
    );
    if (![0, 1].includes(status)) {
      return sendError(res, 400, 'BUSINESS_ENTITY_STATUS_INVALID', 'Check the status');
    }
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    await withTransaction(pool, async (connection) => {
      const current = await loadEntity(connection, scope, id, true);
      if (current.business_entity_kind === 'platform' && status === 0) {
        throw new HttpError(409, 'BUSINESS_ENTITY_IS_PLATFORM', 'The platform entity stays active');
      }
      if (Number(current.business_entity_status) === status) return;
      await connection.query(
        `UPDATE business_entity SET business_entity_status = ?, updated = NOW()
         WHERE id_business_entity = ? AND id_master_comp = ?`,
        [status, id, scope.idMasterComp],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.entity_status_changed',
        action: 'status_change',
        entityType: 'business_entity',
        entityId: id,
        entityLabel: current.business_entity_name,
        before: { status: Number(current.business_entity_status) },
        after: { status },
      });
    });
    return sendSuccess(res, 200, 'BUSINESS_ENTITY_STATUS_UPDATED', 'Entity status updated', {
      id: keyhsid.idBusinessEntity.encode(id),
      status: status === 1,
    });
  },
);

/** Only an inactive entity with no stores, products, or accounts; the row keeps a deletion time. */
router.delete(
  '/api/v1/business/entities/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('BUSINESS_ENTITY_DELETE_FAILED', 'Unable to delete the entity'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!id) return invalidId(res);
    const scope = await scopeOf(req, res);
    if (!scope) return;
    assertPlatformStaff(scope);
    await withTransaction(pool, async (connection) => {
      const current = await loadEntity(connection, scope, id, true);
      if (current.business_entity_kind === 'platform') {
        throw new HttpError(
          409,
          'BUSINESS_ENTITY_IS_PLATFORM',
          'The platform entity cannot be deleted',
        );
      }
      if (Number(current.business_entity_status) !== 0) {
        throw new HttpError(409, 'BUSINESS_ENTITY_MUST_BE_INACTIVE', 'Deactivate the entity first');
      }
      const count = (await countsOf(scope.idMasterComp, [id])).get(id);
      if (count && (count.stores || count.products || count.accounts)) {
        throw new HttpError(
          409,
          'BUSINESS_ENTITY_IN_USE',
          'The entity still has stores, products, or accounts',
          count,
        );
      }
      await connection.query(
        `UPDATE business_entity SET business_entity_deleted_at = NOW(), updated = NOW()
         WHERE id_business_entity = ? AND id_master_comp = ?`,
        [id, scope.idMasterComp],
      );
      await connection.query(
        `UPDATE revenue_share_rule SET revenue_share_rule_deleted_at = NOW()
         WHERE id_business_entity = ? AND revenue_share_rule_deleted_at IS NULL`,
        [id],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.entity_deleted',
        action: 'delete',
        entityType: 'business_entity',
        entityId: id,
        entityLabel: current.business_entity_name,
        before: auditFields(current),
        metadata: { delete_type: 'soft_delete' },
      });
    });
    return sendSuccess(res, 200, 'BUSINESS_ENTITY_DELETED', 'Entity deleted', {
      id: keyhsid.idBusinessEntity.encode(id),
    });
  },
);

export default router;
