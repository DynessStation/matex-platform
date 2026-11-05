// Permission groups and their permissions, for the Hak Akses page, under
// /api/v1/admin-permission-group. A permission points at its group by name, so renaming a group
// renames it on its permissions too. Permissions without a group are listed under "Other", which
// has no row of its own (id null) until someone makes one.
// Contract: ops/e2e/write/admin-permission-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const NO_GROUP = 'Other';
const NAME_MAX = 100;

const readName = (body: { name?: unknown } | undefined) => {
  const name = String(body?.name ?? '').trim();
  if (!name) {
    throw new HttpError(400, 'ADMIN_PERMISSION_GROUP_NAME_REQUIRED', 'Group name is required');
  }
  if (name.length > NAME_MAX) {
    throw new HttpError(400, 'ADMIN_PERMISSION_GROUP_NAME_TOO_LONG', 'Group name is too long');
  }
  return name;
};

const assertNameFree = async (connection: PoolConnection, name: string, id: number | null) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id_admin_permission_group FROM admin_permission_group
     WHERE permission_group_name = ? AND (? IS NULL OR id_admin_permission_group <> ?) LIMIT 1`,
    [name, id, id],
  );
  if (rows.length) {
    throw new HttpError(409, 'ADMIN_PERMISSION_GROUP_EXISTS', 'Group name already exists');
  }
};

const lockGroup = async (connection: PoolConnection, id: number) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id_admin_permission_group, permission_group_name FROM admin_permission_group
     WHERE id_admin_permission_group = ? FOR UPDATE`,
    [id],
  );
  if (!rows[0]) {
    throw new HttpError(404, 'ADMIN_PERMISSION_GROUP_NOT_FOUND', 'Group not found');
  }
  return rows[0];
};

const auditBase = (req: AuthRequest, connection: PoolConnection, id: number, label: string) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  category: 'access_control' as const,
  module: 'admin_permission',
  actorType: 'admin' as const,
  actorId: req.user?.id_admin_acct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'admin_permission_group',
  entityId: id,
  entityLabel: label,
});

const invalidId = (res: Response) =>
  sendError(res, 400, 'ADMIN_PERMISSION_GROUP_INVALID_ID', 'Invalid group identifier');

router.get(
  '/api/v1/admin-permission-group',
  verifyToken,
  requirePermission('admin_permission.view'),
  onFailure('ADMIN_PERMISSION_GROUP_LOAD_FAILED', 'Unable to load permission groups'),
  async (_req: AuthRequest, res: Response) => {
    const [groupRows] = await pool.query<RowDataPacket[]>(
      `SELECT id_admin_permission_group, permission_group_name FROM admin_permission_group
       ORDER BY permission_group_name`,
    );
    const [permissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT ap.id_admin_permission, ap.permission_key, ap.permission_name, ap.permission_group,
         ap.permission_description, ap.permission_status,
         COUNT(DISTINCT aap.id_admin_access) AS access_count
       FROM admin_permission ap
       LEFT JOIN admin_access_permission aap ON ap.id_admin_permission = aap.id_admin_permission
       WHERE ap.permission_deleted_at IS NULL
       GROUP BY ap.id_admin_permission
       ORDER BY ap.id_admin_permission`,
    );

    const groups = groupRows.map((row) => ({
      id_admin_permission_group: keyhsid.idAdminPermissionGroup.encode(
        row.id_admin_permission_group,
      ) as string | null,
      name: String(row.permission_group_name),
      permissions: [] as Record<string, unknown>[],
    }));
    const byName = (name: string) =>
      groups.find((group) => group.name.toLowerCase() === name.toLowerCase());
    for (const row of permissionRows) {
      const name = String(row.permission_group || NO_GROUP);
      let group = byName(name);
      if (!group) {
        group = { id_admin_permission_group: null, name, permissions: [] };
        groups.push(group);
      }
      group.permissions.push({
        id_admin_permission: keyhsid.idAdminPermission.encode(row.id_admin_permission),
        permission_key: row.permission_key,
        permission_name: row.permission_name,
        permission_group: row.permission_group,
        permission_description: row.permission_description,
        permission_status: Number(row.permission_status),
        access_count: Number(row.access_count),
      });
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));

    return sendSuccess(res, 200, 'ADMIN_PERMISSION_GROUPS_LISTED', 'Groups loaded', groups);
  },
);

router.post(
  '/api/v1/admin-permission-group',
  verifyToken,
  requirePermission('admin_permission.create'),
  onFailure('ADMIN_PERMISSION_GROUP_SAVE_FAILED', 'Unable to save the group'),
  async (req: AuthRequest, res: Response) => {
    const name = readName(req.body);
    const id = await withTransaction(pool, async (connection) => {
      await assertNameFree(connection, name, null);
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO admin_permission_group (permission_group_name) VALUES (?)`,
        [name],
      );
      await writeAuditLog({
        ...auditBase(req, connection, insert.insertId, name),
        eventCode: 'admin_permission_group.created',
        action: 'create',
        after: { name },
        httpStatus: 201,
      });
      return insert.insertId;
    });
    return sendSuccess(res, 201, 'ADMIN_PERMISSION_GROUP_CREATED', 'Group created', {
      id_admin_permission_group: keyhsid.idAdminPermissionGroup.encode(id),
      name,
    });
  },
);

router.put(
  '/api/v1/admin-permission-group/:id',
  verifyToken,
  requirePermission('admin_permission.update'),
  onFailure('ADMIN_PERMISSION_GROUP_SAVE_FAILED', 'Unable to save the group'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idAdminPermissionGroup);
    if (!id) return invalidId(res);
    const name = readName(req.body);
    await withTransaction(pool, async (connection) => {
      const group = await lockGroup(connection, id);
      const oldName = String(group.permission_group_name);
      if (oldName === name) return;
      await assertNameFree(connection, name, id);
      await connection.query(
        `UPDATE admin_permission_group SET permission_group_name = ?
         WHERE id_admin_permission_group = ?`,
        [name, id],
      );
      const [moved] = await connection.query<ResultSetHeader>(
        `UPDATE admin_permission SET permission_group = ?, updated = NOW()
         WHERE permission_group = ?`,
        [name, oldName],
      );
      await writeAuditLog({
        ...auditBase(req, connection, id, name),
        eventCode: 'admin_permission_group.renamed',
        action: 'update',
        before: { name: oldName },
        after: { name },
        metadata: { permissions: moved.affectedRows },
        httpStatus: 200,
      });
    });
    return sendSuccess(res, 200, 'ADMIN_PERMISSION_GROUP_UPDATED', 'Group updated', {
      id_admin_permission_group: keyhsid.idAdminPermissionGroup.encode(id),
      name,
    });
  },
);

// Only a group with no live permissions can go.
router.delete(
  '/api/v1/admin-permission-group/:id',
  verifyToken,
  requirePermission('admin_permission.delete'),
  onFailure('ADMIN_PERMISSION_GROUP_DELETE_FAILED', 'Unable to delete the group'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idAdminPermissionGroup);
    if (!id) return invalidId(res);
    await withTransaction(pool, async (connection) => {
      const group = await lockGroup(connection, id);
      const name = String(group.permission_group_name);
      const [used] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM admin_permission
         WHERE permission_group = ? AND permission_deleted_at IS NULL LIMIT 1`,
        [name],
      );
      if (used.length) {
        throw new HttpError(
          409,
          'ADMIN_PERMISSION_GROUP_IN_USE',
          'The group still has permissions',
        );
      }
      await connection.query(
        `DELETE FROM admin_permission_group WHERE id_admin_permission_group = ?`,
        [id],
      );
      await writeAuditLog({
        ...auditBase(req, connection, id, name),
        eventCode: 'admin_permission_group.deleted',
        action: 'delete',
        before: { name },
        httpStatus: 200,
      });
    });
    return sendSuccess(res, 200, 'ADMIN_PERMISSION_GROUP_DELETED', 'Group deleted', {
      id: keyhsid.idAdminPermissionGroup.encode(id),
    });
  },
);

export default router;
