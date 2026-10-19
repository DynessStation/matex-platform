// Admin permissions (the keys access profiles grant), under /api/v1/admin-permission.
// Permissions are global, not per company. Contract: ops/e2e/write/admin-permission-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { parseListQuery, sortColumn, sortDirection } from '../../helper/list-query.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  permission_key: 'ap.permission_key',
  permission_name: 'ap.permission_name',
  permission_group: 'ap.permission_group',
  created: 'ap.created',
  updated: 'ap.updated',
};

const SEARCH = `(ap.permission_key LIKE ? OR ap.permission_name LIKE ? OR ap.permission_group LIKE ?
  OR ap.permission_description LIKE ?)`;

// Lower-case dotted segments, e.g. "admin_account.view".
const PERMISSION_KEY = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

const PERMISSION_SELECT = `SELECT ap.id_admin_permission, ap.permission_key, ap.permission_name,
    ap.permission_group, ap.permission_description, ap.permission_status, ap.created, ap.updated,
    COUNT(DISTINCT aap.id_admin_access) AS access_count
  FROM admin_permission ap
  LEFT JOIN admin_access_permission aap ON ap.id_admin_permission = aap.id_admin_permission`;

const invalidId = (res: Response) =>
  sendError(res, 400, 'ADMIN_PERMISSION_INVALID_ID', 'Invalid admin permission identifier');

const invalid = (code: string, message: string) =>
  new HttpError(400, `ADMIN_PERMISSION_${code}`, message);

/** Name, group, and description; with `withKey` also the key (create only: keys never change). */
const readPermissionInput = (body: any, { withKey }: { withKey: boolean }) => {
  const key = String(body?.permission_key ?? '')
    .trim()
    .toLowerCase();
  const name = String(body?.permission_name ?? '').trim();
  const group = String(body?.permission_group ?? '').trim();
  const description = String(body?.permission_description ?? '').trim();

  if (withKey && !key) throw invalid('KEY_REQUIRED', 'Permission key is required');
  if (!name) throw invalid('NAME_REQUIRED', 'Permission name is required');
  if (withKey && !PERMISSION_KEY.test(key)) {
    throw invalid('KEY_INVALID', 'Permission key format is invalid');
  }
  if (withKey && key.length > 100) throw invalid('KEY_TOO_LONG', 'Permission key is too long');
  if (name.length > 150) throw invalid('NAME_TOO_LONG', 'Permission name is too long');
  if (group.length > 100) throw invalid('GROUP_TOO_LONG', 'Permission group is too long');
  if (description.length > 500) {
    throw invalid('DESCRIPTION_TOO_LONG', 'Permission description is too long');
  }

  return { key, name, group: group || null, description: description || null };
};

const lockPermission = async (connection: PoolConnection, idPermission: number) => {
  const [rows] = await connection.query(
    `SELECT id_admin_permission, permission_key, permission_name, permission_group,
       permission_description, permission_status
     FROM admin_permission
     WHERE id_admin_permission = ? AND permission_status IN (0, 1)
     LIMIT 1
     FOR UPDATE`,
    [idPermission],
  );
  const permission = (rows as any[])[0];
  if (!permission) {
    throw new HttpError(404, 'ADMIN_PERMISSION_NOT_FOUND', 'Admin permission not found');
  }
  return permission;
};

const permissionAudit = (permission: any) => ({
  permission_key: permission.permission_key,
  permission_name: permission.permission_name,
  permission_group: permission.permission_group ?? null,
  permission_description: permission.permission_description ?? null,
  permission_status: Number(permission.permission_status),
});

const auditBase = (req: AuthRequest, connection: PoolConnection, idPermission: number) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  category: 'access_control' as const,
  module: 'admin_permission',
  actorType: 'admin' as const,
  actorId: req.user?.id_admin_acct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'admin_permission',
  entityId: idPermission,
});

const permissionDto = (item: any) => ({
  id_admin_permission: keyhsid.idAdminPermission.encode(item.id_admin_permission),
  permission_key: item.permission_key,
  permission_name: item.permission_name,
  permission_group: item.permission_group,
  permission_description: item.permission_description,
  permission_status: Number(item.permission_status),
});

router.get(
  '/api/v1/admin-permission',
  verifyToken,
  requirePermission('admin_permission.view'),
  async (req: AuthRequest, res: Response) => {
    // The admin UI sends the page size as ?paginate=.
    const { page, limit, offset, searchValue } = parseListQuery({
      ...req.query,
      limit: req.query.paginate ?? req.query.limit,
    });
    const orderBy = sortColumn(SORTABLE, req.query.field, 'ap.permission_group');
    const direction = sortDirection(String(req.query.sort ?? '').toLowerCase(), 'ASC');
    const searchValues = [searchValue, searchValue, searchValue, searchValue];

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_permission ap
       WHERE ap.permission_status IN (0, 1) AND ${SEARCH}`,
      searchValues,
    );
    const total = Number((totalRows as any[])[0]?.total ?? 0);

    const [rows] = await pool.query(
      `${PERMISSION_SELECT}
       WHERE ap.permission_status IN (0, 1) AND ${SEARCH}
       GROUP BY ap.id_admin_permission
       ORDER BY ${orderBy} ${direction}, ap.permission_name ASC
       LIMIT ? OFFSET ?`,
      [...searchValues, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      ...permissionDto(item),
      status_label: Number(item.permission_status) === 1 ? 'Active' : 'Inactive',
      access_count: Number(item.access_count ?? 0),
      created: item.created,
      updated: item.updated,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: { total, page, limit, length: data.length, pagerows: Math.ceil(total / limit) },
    });
  },
);

router.post(
  '/api/v1/admin-permission',
  verifyToken,
  requirePermission('admin_permission.create'),
  async (req: AuthRequest, res: Response) => {
    const input = readPermissionInput(req.body, { withKey: true });

    const idPermission = await withTransaction(pool, async (connection) => {
      // Deleted permissions keep their key reserved.
      const [duplicates] = await connection.query(
        `SELECT id_admin_permission FROM admin_permission WHERE permission_key = ? LIMIT 1`,
        [input.key],
      );
      if ((duplicates as unknown[]).length) {
        throw new HttpError(409, 'ADMIN_PERMISSION_KEY_EXISTS', 'Permission key already exists');
      }

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO admin_permission (permission_key, permission_name, permission_group,
           permission_description, permission_status, created, updated)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [input.key, input.name, input.group, input.description],
      );
      const id = Number(insert.insertId);
      await writeAuditLog({
        ...auditBase(req, connection, id),
        eventCode: 'admin_permission.created',
        action: 'create',
        entityLabel: input.key,
        after: {
          permission_key: input.key,
          permission_name: input.name,
          permission_group: input.group,
          permission_description: input.description,
          permission_status: 1,
        },
        httpStatus: 201,
      });
      return id;
    });

    return sendSuccess(
      res,
      201,
      'ADMIN_PERMISSION_CREATED',
      'Admin permission created successfully',
      {
        id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
      },
    );
  },
);

router.get(
  '/api/v1/admin-permission/:id',
  verifyToken,
  requirePermission('admin_permission.view'),
  async (req: AuthRequest, res: Response) => {
    const idPermission = decodeId(req.params.id, keyhsid.idAdminPermission);
    if (!idPermission) return invalidId(res);

    const [rows] = await pool.query(
      `${PERMISSION_SELECT}
       WHERE ap.id_admin_permission = ? AND ap.permission_status IN (0, 1)
       GROUP BY ap.id_admin_permission
       LIMIT 1`,
      [idPermission],
    );
    const item = (rows as any[])[0];
    if (!item)
      return sendError(res, 404, 'ADMIN_PERMISSION_NOT_FOUND', 'Admin permission not found');

    return res.status(200).json({
      success: true,
      data: {
        ...permissionDto(item),
        access_count: Number(item.access_count ?? 0),
        created: item.created,
        updated: item.updated,
      },
    });
  },
);

// The key is immutable: only name, group, and description change.
router.put(
  '/api/v1/admin-permission/:id',
  verifyToken,
  requirePermission('admin_permission.update'),
  async (req: AuthRequest, res: Response) => {
    const idPermission = decodeId(req.params.id, keyhsid.idAdminPermission);
    if (!idPermission) return invalidId(res);

    const input = readPermissionInput(req.body, { withKey: false });

    await withTransaction(pool, async (connection) => {
      const permission = await lockPermission(connection, idPermission);
      const before = permissionAudit(permission);
      const after = {
        ...before,
        permission_name: input.name,
        permission_group: input.group,
        permission_description: input.description,
      };

      await connection.query(
        `UPDATE admin_permission
         SET permission_name = ?, permission_group = ?, permission_description = ?, updated = NOW()
         WHERE id_admin_permission = ?`,
        [input.name, input.group, input.description, idPermission],
      );

      const changed =
        before.permission_name !== after.permission_name ||
        before.permission_group !== after.permission_group ||
        before.permission_description !== after.permission_description;
      if (!changed) return;

      await writeAuditLog({
        ...auditBase(req, connection, idPermission),
        eventCode: 'admin_permission.updated',
        action: 'update',
        entityLabel: permission.permission_key,
        before,
        after,
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      'ADMIN_PERMISSION_UPDATED',
      'Admin permission updated successfully',
      {
        id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
      },
    );
  },
);

router.patch(
  '/api/v1/admin-permission/:id/status',
  verifyToken,
  requirePermission('admin_permission.update'),
  async (req: AuthRequest, res: Response) => {
    const idPermission = decodeId(req.params.id, keyhsid.idAdminPermission);
    if (!idPermission) return invalidId(res);

    const newStatus = Number(req.body?.permission_status);
    if (![0, 1].includes(newStatus)) {
      return sendError(res, 400, 'ADMIN_PERMISSION_INVALID_STATUS', 'Invalid permission status');
    }

    const changed = await withTransaction(pool, async (connection) => {
      const permission = await lockPermission(connection, idPermission);
      if (Number(permission.permission_status) === newStatus) return false;

      const [roleRows] = await connection.query(
        `SELECT COUNT(DISTINCT aa.id_admin_access) AS total
         FROM admin_access_permission aap
         INNER JOIN admin_access aa ON aap.id_admin_access = aa.id_admin_access
         WHERE aap.id_admin_permission = ? AND aa.admin_access_status = 1`,
        [idPermission],
      );
      await connection.query(
        `UPDATE admin_permission SET permission_status = ?, updated = NOW()
         WHERE id_admin_permission = ?`,
        [newStatus, idPermission],
      );
      await writeAuditLog({
        ...auditBase(req, connection, idPermission),
        eventCode: 'admin_permission.status_changed',
        action: 'status_change',
        entityLabel: permission.permission_key,
        before: { permission_status: Number(permission.permission_status) },
        after: { permission_status: newStatus },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
          affected_access_roles: Number((roleRows as any[])[0]?.total ?? 0),
        },
        httpStatus: 200,
      });
      return true;
    });

    const active = newStatus === 1;
    const [code, message] = changed
      ? active
        ? ['ADMIN_PERMISSION_ACTIVATED', 'Admin permission activated successfully']
        : ['ADMIN_PERMISSION_DEACTIVATED', 'Admin permission deactivated successfully']
      : active
        ? ['ADMIN_PERMISSION_ALREADY_ACTIVE', 'Admin permission is already active']
        : ['ADMIN_PERMISSION_ALREADY_INACTIVE', 'Admin permission is already inactive'];
    return sendSuccess(res, 200, code, message, {
      id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
      permission_status: newStatus,
    });
  },
);

// Only an inactive permission that no access profile holds can be deleted; the row is kept
// with status 99.
router.delete(
  '/api/v1/admin-permission/:id',
  verifyToken,
  requirePermission('admin_permission.delete'),
  async (req: AuthRequest, res: Response) => {
    const idPermission = decodeId(req.params.id, keyhsid.idAdminPermission);
    if (!idPermission) return invalidId(res);

    await withTransaction(pool, async (connection) => {
      const permission = await lockPermission(connection, idPermission);
      if (Number(permission.permission_status) !== 0) {
        throw new HttpError(
          409,
          'ADMIN_PERMISSION_MUST_BE_INACTIVE',
          'Deactivate the admin permission before deleting it',
        );
      }

      const [referenceRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM admin_access_permission WHERE id_admin_permission = ?`,
        [idPermission],
      );
      const accessRoles = Number((referenceRows as any[])[0]?.total ?? 0);
      if (accessRoles > 0) {
        throw new HttpError(
          409,
          'ADMIN_PERMISSION_HAS_ACCESS_REFERENCES',
          'Admin permission is still assigned to one or more access roles',
          { access_roles: accessRoles },
        );
      }

      const before = permissionAudit(permission);
      await connection.query(
        `UPDATE admin_permission SET permission_status = 99, updated = NOW()
         WHERE id_admin_permission = ?`,
        [idPermission],
      );
      await writeAuditLog({
        ...auditBase(req, connection, idPermission),
        eventCode: 'admin_permission.deleted',
        action: 'delete',
        entityLabel: permission.permission_key,
        before,
        after: { ...before, permission_status: 99 },
        metadata: { delete_type: 'soft_delete' },
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      'ADMIN_PERMISSION_DELETED',
      'Admin permission deleted successfully',
      {
        id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
      },
    );
  },
);

export default router;
