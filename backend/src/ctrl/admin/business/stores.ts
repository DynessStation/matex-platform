// Stores: one account of an entity on one sales channel ("Setia Latex di TikTok").
import express = require('express');
import { Response } from 'express';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import {
  auditBusiness,
  canSeeEntity,
  entityWhere,
  loadEntity,
} from '../../../helper/business.helper';
import { ensureChannels } from '../../../helper/costing.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { isValidHttpUrl, nullableString, toFlag, trimTo } from '../../../helper/input.helper';
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

interface StoreRow extends RowDataPacket {
  id_store: number;
  id_business_entity: number;
  business_entity_name: string;
  id_sales_channel: number;
  sales_channel_name: string;
  store_name: string;
  store_url: string | null;
  store_external_id: string | null;
  store_note: string | null;
  store_status: number;
}

const STORE_SELECT = `SELECT s.id_store, s.id_business_entity, be.business_entity_name,
    s.id_sales_channel, sc.sales_channel_name, s.store_name, s.store_url, s.store_external_id,
    s.store_note, s.store_status, s.created, s.updated
  FROM store s
  INNER JOIN business_entity be ON be.id_business_entity = s.id_business_entity
  INNER JOIN sales_channel sc ON sc.id_sales_channel = s.id_sales_channel`;

const storeDto = (row: StoreRow) => ({
  id: keyhsid.idStore.encode(row.id_store),
  entity_id: keyhsid.idBusinessEntity.encode(row.id_business_entity),
  entity_name: row.business_entity_name,
  channel_id: keyhsid.idSalesChannel.encode(row.id_sales_channel),
  channel_name: row.sales_channel_name,
  name: row.store_name,
  url: row.store_url,
  external_id: row.store_external_id,
  note: row.store_note,
  status: Number(row.store_status) === 1,
  created: row.created,
  updated: row.updated,
});

const auditFields = (row: StoreRow) => ({
  entity: row.business_entity_name,
  channel: row.sales_channel_name,
  name: row.store_name,
  url: row.store_url,
  external_id: row.store_external_id,
  note: row.store_note,
  status: Number(row.store_status),
});

interface StoreInput {
  idChannel: number;
  name: string;
  url: string | null;
  externalId: string | null;
  note: string | null;
  status: 0 | 1;
}

const readStoreInput = async (
  connection: PoolConnection,
  idMasterComp: number,
  body: RequestBody,
  current?: StoreRow,
): Promise<StoreInput> => {
  const name = trimTo(body?.name, 150);
  if (!name) throw new HttpError(400, 'STORE_NAME_REQUIRED', 'Store name is required');
  const idChannel =
    typeof body?.channel_id === 'string' ? decodeId(body.channel_id, keyhsid.idSalesChannel) : null;
  if (!idChannel) throw new HttpError(400, 'STORE_CHANNEL_INVALID', 'Check the sales channel');
  const [channels] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM sales_channel WHERE id_sales_channel = ? AND id_master_comp = ?
       AND sales_channel_status = 1 AND sales_channel_deleted_at IS NULL LIMIT 1`,
    [idChannel, idMasterComp],
  );
  if (!channels.length)
    throw new HttpError(400, 'STORE_CHANNEL_INVALID', 'Check the sales channel');
  const url = nullableString(body?.url);
  if (url && (url.length > 500 || !isValidHttpUrl(url))) {
    throw new HttpError(400, 'STORE_URL_INVALID', 'Check the store link');
  }
  return {
    idChannel,
    name,
    url,
    externalId: nullableString(body?.external_id)?.slice(0, 100) ?? null,
    note: nullableString(body?.note),
    status: toFlag(body?.status, current ? (Number(current.store_status) as 0 | 1) : 1),
  };
};

const loadStore = async (
  connection: PoolConnection,
  scope: AdminScope,
  idStore: number,
): Promise<StoreRow> => {
  const visible = entityWhere(scope, 's.id_business_entity');
  const [rows] = await connection.query<StoreRow[]>(
    `${STORE_SELECT}
     WHERE s.id_store = ? AND s.id_master_comp = ? AND s.store_deleted_at IS NULL ${visible.sql}
     LIMIT 1 FOR UPDATE`,
    [idStore, scope.idMasterComp, ...visible.params],
  );
  const store = rows[0];
  if (!store) throw new HttpError(404, 'STORE_NOT_FOUND', 'Store not found');
  return store;
};

const assertStoreUnique = async (
  connection: PoolConnection,
  idBusinessEntity: number,
  input: StoreInput,
  excludeId?: number,
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM store
     WHERE id_business_entity = ? AND id_sales_channel = ? AND LOWER(store_name) = LOWER(?)
       AND store_deleted_at IS NULL ${excludeId ? 'AND id_store != ?' : ''} LIMIT 1`,
    excludeId
      ? [idBusinessEntity, input.idChannel, input.name, excludeId]
      : [idBusinessEntity, input.idChannel, input.name],
  );
  if (rows.length) {
    throw new HttpError(409, 'STORE_EXISTS', 'This entity already has that store on that channel');
  }
};

/** Active sales channels, for the store form. */
router.get(
  '/api/v1/business/channels',
  verifyToken,
  requirePermission('business.view'),
  onFailure('BUSINESS_CHANNELS_FAILED', 'Unable to load the channels'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await ensureChannels(pool, scope.idMasterComp);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_sales_channel, sales_channel_key, sales_channel_name FROM sales_channel
       WHERE id_master_comp = ? AND sales_channel_status = 1 AND sales_channel_deleted_at IS NULL
       ORDER BY sales_channel_sort_order, sales_channel_name`,
      [scope.idMasterComp],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idSalesChannel.encode(row.id_sales_channel),
      key: row.sales_channel_key,
      name: row.sales_channel_name,
    }));
    return sendList(res, 'BUSINESS_CHANNELS_FOUND', 'Channels loaded', data, {
      total: data.length,
    });
  },
);

/** Every store the account may see, optionally of one entity (?entity=). */
router.get(
  '/api/v1/business/stores',
  verifyToken,
  requirePermission('business.view'),
  onFailure('BUSINESS_STORES_FAILED', 'Unable to load the stores'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const visible = entityWhere(scope, 's.id_business_entity');
    const entity =
      typeof req.query.entity === 'string'
        ? decodeId(req.query.entity, keyhsid.idBusinessEntity)
        : null;
    if (req.query.entity !== undefined && !entity) {
      return sendError(res, 400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');
    }
    const [rows] = await pool.query<StoreRow[]>(
      `${STORE_SELECT}
       WHERE s.id_master_comp = ? AND s.store_deleted_at IS NULL ${visible.sql}
         ${entity ? 'AND s.id_business_entity = ?' : ''}
       ORDER BY be.business_entity_name, sc.sales_channel_sort_order, s.store_name`,
      [scope.idMasterComp, ...visible.params, ...(entity ? [entity] : [])],
    );
    const data = rows.map(storeDto);
    return sendList(res, 'BUSINESS_STORES_FOUND', 'Stores loaded', data, { total: data.length });
  },
);

router.post(
  '/api/v1/business/entities/:id/stores',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('STORE_SAVE_FAILED', 'Unable to save the store'),
  async (req: AuthRequest, res: Response) => {
    const idEntity = decodeId(req.params.id, keyhsid.idBusinessEntity);
    if (!idEntity)
      return sendError(res, 400, 'BUSINESS_ENTITY_INVALID_ID', 'Invalid entity identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const id = await withTransaction(pool, async (connection) => {
      const entity = await loadEntity(connection, scope, idEntity, true);
      const input = await readStoreInput(connection, scope.idMasterComp, req.body);
      await assertStoreUnique(connection, idEntity, input);
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO store (id_master_comp, id_business_entity, id_sales_channel, store_name,
           store_url, store_external_id, store_note, store_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          idEntity,
          input.idChannel,
          input.name,
          input.url,
          input.externalId,
          input.note,
          input.status,
        ],
      );
      const created = Number(insert.insertId);
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.store_created',
        action: 'create',
        entityType: 'store',
        entityId: created,
        entityLabel: `${entity.business_entity_name}: ${input.name}`,
        after: { ...input, entity: entity.business_entity_name },
      });
      return created;
    });
    return sendSuccess(res, 201, 'STORE_CREATED', 'Store created', {
      id: keyhsid.idStore.encode(id),
    });
  },
);

router.put(
  '/api/v1/business/stores/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('STORE_SAVE_FAILED', 'Unable to save the store'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idStore);
    if (!id) return sendError(res, 400, 'STORE_INVALID_ID', 'Invalid store identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await withTransaction(pool, async (connection) => {
      const current = await loadStore(connection, scope, id);
      if (!canSeeEntity(scope, current.id_business_entity)) {
        throw new HttpError(404, 'STORE_NOT_FOUND', 'Store not found');
      }
      const input = await readStoreInput(connection, scope.idMasterComp, req.body, current);
      await assertStoreUnique(connection, current.id_business_entity, input, id);
      await connection.query(
        `UPDATE store SET id_sales_channel = ?, store_name = ?, store_url = ?, store_external_id = ?,
           store_note = ?, store_status = ?, updated = NOW()
         WHERE id_store = ? AND id_master_comp = ?`,
        [
          input.idChannel,
          input.name,
          input.url,
          input.externalId,
          input.note,
          input.status,
          id,
          scope.idMasterComp,
        ],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.store_updated',
        action: 'update',
        entityType: 'store',
        entityId: id,
        entityLabel: `${current.business_entity_name}: ${input.name}`,
        before: auditFields(current),
        after: {
          entity: current.business_entity_name,
          channel_id: input.idChannel,
          name: input.name,
          url: input.url,
          external_id: input.externalId,
          note: input.note,
          status: input.status,
        },
      });
    });
    return sendSuccess(res, 200, 'STORE_UPDATED', 'Store updated', {
      id: keyhsid.idStore.encode(id),
    });
  },
);

router.delete(
  '/api/v1/business/stores/:id',
  verifyToken,
  requirePermission('business.manage'),
  onFailure('STORE_DELETE_FAILED', 'Unable to delete the store'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idStore);
    if (!id) return sendError(res, 400, 'STORE_INVALID_ID', 'Invalid store identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    await withTransaction(pool, async (connection) => {
      const current = await loadStore(connection, scope, id);
      const [rules] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM revenue_share_rule
         WHERE id_store = ? AND revenue_share_rule_deleted_at IS NULL`,
        [id],
      );
      const ruleCount = Number(rules[0]?.total ?? 0);
      if (ruleCount) {
        throw new HttpError(
          409,
          'STORE_HAS_RULES',
          'Remove the revenue share rules of this store first',
          {
            rules: ruleCount,
          },
        );
      }
      await connection.query(
        `UPDATE store SET store_status = 0, store_deleted_at = NOW(), updated = NOW()
         WHERE id_store = ? AND id_master_comp = ?`,
        [id, scope.idMasterComp],
      );
      await auditBusiness(req, connection, scope, {
        eventCode: 'business.store_deleted',
        action: 'delete',
        entityType: 'store',
        entityId: id,
        entityLabel: `${current.business_entity_name}: ${current.store_name}`,
        before: auditFields(current),
        metadata: { delete_type: 'soft_delete' },
      });
    });
    return sendSuccess(res, 200, 'STORE_DELETED', 'Store deleted', {
      id: keyhsid.idStore.encode(id),
    });
  },
);

export default router;
