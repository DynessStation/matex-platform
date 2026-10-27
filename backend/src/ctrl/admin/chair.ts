// Positions (chair) of the company, under /api/v1/chair.
// Contract: ops/e2e/write/chair-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { parseListQuery, sortColumn, sortDirection, countOf } from '../../helper/list-query.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import type { RequestBody } from '../../helper/input.helper';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  id: 'ch.id_chair',
  chair_name: 'ch.chair_name',
  admin_count: 'admin_count',
  created: 'ch.created',
  updated: 'ch.updated',
};

const SEARCH = `(ch.chair_name LIKE ? OR COALESCE(ch.chair_description, '') LIKE ?)`;

const invalidId = (res: Response) =>
  sendError(res, 400, 'CHAIR_INVALID_ID', 'Invalid position identifier');
const chairNotFound = () => new HttpError(404, 'CHAIR_NOT_FOUND', 'Position not found');

const readChairInput = (body: RequestBody) => {
  const name = typeof body?.chair_name === 'string' ? body.chair_name.trim() : '';
  const description =
    typeof body?.chair_description === 'string' && body.chair_description.trim()
      ? body.chair_description.trim()
      : null;
  if (!name) throw new HttpError(400, 'CHAIR_NAME_REQUIRED', 'Position name is required');
  if (name.length > 255)
    throw new HttpError(400, 'CHAIR_NAME_TOO_LONG', 'Position name is too long');
  return { name, description };
};

const assertChairNameUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  name: string,
  excludeIdChair?: number,
) => {
  const [rows] = await connection.query(
    `SELECT id_chair FROM chair
     WHERE id_master_comp = ? AND LOWER(chair_name) = LOWER(?)
       ${excludeIdChair ? 'AND id_chair != ?' : ''} AND chair_status IN (0, 1)
     LIMIT 1`,
    excludeIdChair ? [idMasterComp, name, excludeIdChair] : [idMasterComp, name],
  );
  if ((rows as unknown[]).length) {
    throw new HttpError(409, 'CHAIR_ALREADY_EXISTS', 'Position name is already in use');
  }
};

const lockChair = async (connection: PoolConnection, idChair: number, idMasterComp: number) => {
  const [rows] = await connection.query(
    `SELECT id_chair, chair_name, chair_description, chair_status
     FROM chair
     WHERE id_chair = ? AND id_master_comp = ? AND chair_status IN (0, 1)
     LIMIT 1
     FOR UPDATE`,
    [idChair, idMasterComp],
  );
  const chair = (rows as RowDataPacket[])[0];
  if (!chair) throw chairNotFound();
  return chair;
};

const countAssignedAccounts = async (
  connection: PoolConnection,
  idMasterComp: number,
  idChair: number,
) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM admin_acct
     WHERE id_master_comp = ? AND id_chair = ? AND admin_acct_status IN (0, 1)`,
    [idMasterComp, idChair],
  );
  return Number((rows as RowDataPacket[])[0]?.total ?? 0);
};

const chairAudit = (chair: RowDataPacket) => ({
  chair_name: chair.chair_name,
  chair_description: chair.chair_description ?? null,
  chair_status: Number(chair.chair_status),
});

const auditBase = (
  req: AuthRequest,
  connection: PoolConnection,
  scope: { idMasterComp: number; idAdminAcct: number },
  idChair: number,
) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  idMasterComp: scope.idMasterComp,
  category: 'data_change' as const,
  module: 'chair',
  actorType: 'admin' as const,
  actorId: scope.idAdminAcct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'chair',
  entityId: idChair,
});

router.get(
  '/api/v1/chair',
  verifyToken,
  requirePermission('chair.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const { page, limit, offset, searchValue } = parseListQuery(req.query);
    const orderBy = sortColumn(SORTABLE, req.query.ord, 'ch.id_chair');
    const direction = sortDirection(req.query.srt, 'ASC');

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM chair ch
       WHERE ch.id_master_comp = ? AND ch.chair_status IN (0, 1) AND ${SEARCH}`,
      [scope.idMasterComp, searchValue, searchValue],
    );
    const total = Number((totalRows as RowDataPacket[])[0]?.total ?? 0);
    // Rows before search and filters, for "x of y" in the admin table.
    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM chair WHERE id_master_comp = ? AND chair_status IN (0, 1)`,
      [scope.idMasterComp],
    );

    const [rows] = await pool.query(
      `SELECT ch.id_chair, ch.chair_name, ch.chair_description, ch.chair_status, ch.created,
         ch.updated, COUNT(DISTINCT aa.id_admin_acct) AS admin_count
       FROM chair ch
       LEFT JOIN admin_acct aa ON ch.id_chair = aa.id_chair AND aa.admin_acct_status IN (0, 1)
       WHERE ch.id_master_comp = ? AND ch.chair_status IN (0, 1) AND ${SEARCH}
       GROUP BY ch.id_chair, ch.chair_name, ch.chair_description, ch.chair_status, ch.created,
         ch.updated
       ORDER BY ${orderBy} ${direction}
       LIMIT ? OFFSET ?`,
      [scope.idMasterComp, searchValue, searchValue, limit, offset],
    );

    const data = (rows as RowDataPacket[]).map((item) => ({
      id_chair: keyhsid.idChair.encode(item.id_chair),
      chair_name: item.chair_name,
      chair_description: item.chair_description,
      admin_count: Number(item.admin_count ?? 0),
      chair_status: Number(item.chair_status),
      status_label: Number(item.chair_status) === 1 ? 'Active' : 'Inactive',
      created: item.created,
      updated: item.updated,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_all: totalAll,
        length: data.length,
        pagerows: Math.ceil(total / limit),
        total_pages: Math.ceil(total / limit),
        has_more: offset + data.length < total,
      },
    });
  },
);

router.post(
  '/api/v1/chair',
  verifyToken,
  requirePermission('chair.create'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readChairInput(req.body);

    const idChair = await withTransaction(pool, async (connection) => {
      await assertChairNameUnique(connection, scope.idMasterComp, input.name);
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO chair (id_master_comp, chair_name, chair_description, chair_status, created, updated)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [scope.idMasterComp, input.name, input.description],
      );
      const id = Number(insert.insertId);
      await writeAuditLog({
        ...auditBase(req, connection, scope, id),
        eventCode: 'chair.created',
        action: 'create',
        entityLabel: input.name,
        after: { chair_name: input.name, chair_description: input.description, chair_status: 1 },
        httpStatus: 201,
      });
      return id;
    });

    return sendSuccess(res, 201, 'CHAIR_CREATED', 'Position created successfully', {
      id_chair: keyhsid.idChair.encode(idChair),
    });
  },
);

router.get(
  '/api/v1/chair/:id',
  verifyToken,
  requirePermission('chair.view'),
  async (req: AuthRequest, res: Response) => {
    const idChair = decodeId(req.params.id, keyhsid.idChair);
    if (!idChair) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query(
      `SELECT ch.id_chair, ch.chair_name, ch.chair_description, ch.chair_status, ch.created,
         ch.updated,
         (SELECT COUNT(*) FROM admin_acct aa
          WHERE aa.id_chair = ch.id_chair AND aa.admin_acct_status IN (0, 1)) AS admin_count
       FROM chair ch
       WHERE ch.id_chair = ? AND ch.id_master_comp = ? AND ch.chair_status IN (0, 1)
       LIMIT 1`,
      [idChair, scope.idMasterComp],
    );
    const chair = (rows as RowDataPacket[])[0];
    if (!chair) return sendError(res, 404, 'CHAIR_NOT_FOUND', 'Position not found');

    return res.status(200).json({
      success: true,
      data: {
        id_chair: keyhsid.idChair.encode(chair.id_chair),
        chair_name: chair.chair_name,
        chair_description: chair.chair_description,
        chair_status: Number(chair.chair_status),
        status_label: Number(chair.chair_status) === 1 ? 'Active' : 'Inactive',
        admin_count: Number(chair.admin_count ?? 0),
        created: chair.created,
        updated: chair.updated,
      },
    });
  },
);

router.put(
  '/api/v1/chair/:id',
  verifyToken,
  requirePermission('chair.update'),
  async (req: AuthRequest, res: Response) => {
    const idChair = decodeId(req.params.id, keyhsid.idChair);
    if (!idChair) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readChairInput(req.body);

    await withTransaction(pool, async (connection) => {
      const chair = await lockChair(connection, idChair, scope.idMasterComp);
      await assertChairNameUnique(connection, scope.idMasterComp, input.name, idChair);

      const before = chairAudit(chair);
      const after = {
        chair_name: input.name,
        chair_description: input.description,
        chair_status: before.chair_status,
      };
      if (
        before.chair_name === after.chair_name &&
        before.chair_description === after.chair_description
      ) {
        return;
      }

      await connection.query(
        `UPDATE chair SET chair_name = ?, chair_description = ?, updated = NOW()
         WHERE id_chair = ? AND id_master_comp = ?`,
        [input.name, input.description, idChair, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, idChair),
        eventCode: 'chair.updated',
        action: 'update',
        entityLabel: input.name,
        before,
        after,
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'CHAIR_UPDATED', 'Position updated successfully', {
      id_chair: keyhsid.idChair.encode(idChair),
    });
  },
);

router.patch(
  '/api/v1/chair/:id/status',
  verifyToken,
  requirePermission('chair.update'),
  async (req: AuthRequest, res: Response) => {
    const idChair = decodeId(req.params.id, keyhsid.idChair);
    if (!idChair) return invalidId(res);

    const newStatus = Number(req.body?.chair_status);
    if (![0, 1].includes(newStatus)) {
      return sendError(res, 400, 'CHAIR_INVALID_STATUS', 'Invalid position status');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const result = await withTransaction(pool, async (connection) => {
      const chair = await lockChair(connection, idChair, scope.idMasterComp);
      if (Number(chair.chair_status) === newStatus) return { unchanged: true, affectedAccounts: 0 };

      const affectedAccounts = await countAssignedAccounts(connection, scope.idMasterComp, idChair);
      await connection.query(
        `UPDATE chair SET chair_status = ?, updated = NOW() WHERE id_chair = ? AND id_master_comp = ?`,
        [newStatus, idChair, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, idChair),
        eventCode: 'chair.status_changed',
        action: 'status_change',
        entityLabel: chair.chair_name,
        before: { chair_status: Number(chair.chair_status) },
        after: { chair_status: newStatus },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
        httpStatus: 200,
      });
      return { unchanged: false, affectedAccounts };
    });

    const id = keyhsid.idChair.encode(idChair);
    if (result.unchanged) {
      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'CHAIR_ALREADY_ACTIVE' : 'CHAIR_ALREADY_INACTIVE',
        newStatus === 1 ? 'Position is already active' : 'Position is already inactive',
        { id_chair: id, chair_status: newStatus },
      );
    }
    return sendSuccess(
      res,
      200,
      newStatus === 1 ? 'CHAIR_ACTIVATED' : 'CHAIR_DEACTIVATED',
      newStatus === 1 ? 'Position activated successfully' : 'Position deactivated successfully',
      {
        id_chair: id,
        chair_status: newStatus,
        affected_accounts: newStatus === 0 ? result.affectedAccounts : 0,
      },
    );
  },
);

// Only an inactive position without assigned admins can be deleted; the row is kept with status 99.
router.delete(
  '/api/v1/chair/:id',
  verifyToken,
  requirePermission('chair.delete'),
  async (req: AuthRequest, res: Response) => {
    const idChair = decodeId(req.params.id, keyhsid.idChair);
    if (!idChair) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const chair = await lockChair(connection, idChair, scope.idMasterComp);
      if (Number(chair.chair_status) !== 0) {
        throw new HttpError(
          409,
          'CHAIR_MUST_BE_INACTIVE',
          'Deactivate the position before deleting it',
        );
      }
      const assignedAccounts = await countAssignedAccounts(connection, scope.idMasterComp, idChair);
      if (assignedAccounts > 0) {
        throw new HttpError(
          409,
          'CHAIR_HAS_ADMIN_REFERENCES',
          'Position is still assigned to one or more admin accounts',
          { assigned_accounts: assignedAccounts },
        );
      }

      const before = chairAudit(chair);
      await connection.query(
        `UPDATE chair SET chair_status = 99, updated = NOW() WHERE id_chair = ? AND id_master_comp = ?`,
        [idChair, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, idChair),
        eventCode: 'chair.deleted',
        action: 'delete',
        entityLabel: chair.chair_name,
        before,
        after: { ...before, chair_status: 99 },
        metadata: { delete_type: 'soft_delete' },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'CHAIR_DELETED', 'Position deleted successfully', {
      id_chair: keyhsid.idChair.encode(idChair),
    });
  },
);

export default router;
