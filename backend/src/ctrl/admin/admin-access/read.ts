// Access-profile list, permission matrix, and detail. /permission-matrix is registered before
// /:id: Express matches in registration order, and /:id would otherwise answer it as an id.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { countOf, pageMeta, parseListQuery, sortColumn } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  id: 'aa.id_admin_access',
  access_name: 'aa.access_name',
  permission_count: 'permission_count',
  admin_count: 'admin_count',
  created: 'aa.created',
  updated: 'aa.updated',
};

const SEARCH = `(aa.access_name LIKE ? OR COALESCE(aa.access_description, '') LIKE ?)`;

const permissionDto = (item: RowDataPacket) => ({
  id_admin_permission: keyhsid.idAdminPermission.encode(item.id_admin_permission),
  permission_key: item.permission_key,
  permission_name: item.permission_name,
  permission_group: item.permission_group,
  permission_description: item.permission_description,
});

router.get(
  '/api/v1/admin-access',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const {
      page,
      limit,
      offset,
      searchValue,
      sort,
      direction: requested,
    } = parseListQuery(req.query);
    const orderBy = sortColumn(SORTABLE, sort, 'aa.id_admin_access');
    const direction = requested ?? 'ASC';

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_access aa
       WHERE aa.id_master_comp = ? AND aa.admin_access_status IN (0, 1) AND ${SEARCH}`,
      [scope.idMasterComp, searchValue, searchValue],
    );
    const total = Number((totalRows as RowDataPacket[])[0]?.total ?? 0);
    // Rows before search and filters, for "x of y" in the admin table.
    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM admin_access WHERE id_master_comp = ? AND admin_access_status IN (0, 1)`,
      [scope.idMasterComp],
    );

    const [rows] = await pool.query(
      `SELECT aa.id_admin_access, aa.access_name, aa.access_description, aa.admin_access_status,
         aa.created, aa.updated,
         COUNT(DISTINCT ap.id_admin_permission) AS permission_count,
         COUNT(DISTINCT acct.id_admin_acct) AS admin_count
       FROM admin_access aa
       LEFT JOIN admin_access_permission aap ON aa.id_admin_access = aap.id_admin_access
       LEFT JOIN admin_permission ap ON aap.id_admin_permission = ap.id_admin_permission
         AND ap.permission_status = 1
       LEFT JOIN admin_acct acct ON aa.id_admin_access = acct.id_access
         AND acct.admin_acct_status IN (0, 1)
       WHERE aa.id_master_comp = ? AND aa.admin_access_status IN (0, 1) AND ${SEARCH}
       GROUP BY aa.id_admin_access, aa.access_name, aa.access_description,
         aa.admin_access_status, aa.created, aa.updated
       ORDER BY ${orderBy} ${direction}
       LIMIT ? OFFSET ?`,
      [scope.idMasterComp, searchValue, searchValue, limit, offset],
    );

    const data = (rows as RowDataPacket[]).map((item) => ({
      id_admin_access: keyhsid.idAdminAccess.encode(item.id_admin_access),
      access_name: item.access_name,
      access_description: item.access_description,
      permission_count: Number(item.permission_count ?? 0),
      admin_count: Number(item.admin_count ?? 0),
      admin_access_status: Number(item.admin_access_status),
      status_label: Number(item.admin_access_status) === 1 ? 'Active' : 'Inactive',
      created: item.created,
      updated: item.updated,
    }));

    return sendList(
      res,
      'ADMIN_ACCESS_LISTED',
      'Access profiles loaded',
      data,
      pageMeta({ page, limit }, total, totalAll),
    );
  },
);

router.get(
  '/api/v1/admin-access/permission-matrix',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query(
      `SELECT id_admin_permission, permission_key, permission_name, permission_group,
         permission_description
       FROM admin_permission
       WHERE permission_status = 1
       ORDER BY COALESCE(permission_group, 'Other') ASC, permission_key ASC`,
    );

    const grouped = new Map<string, unknown[]>();
    for (const item of rows as RowDataPacket[]) {
      const group = item.permission_group ? String(item.permission_group).trim() : 'Other';
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push({
        id_admin_permission: keyhsid.idAdminPermission.encode(item.id_admin_permission),
        permission_key: item.permission_key,
        permission_name: item.permission_name,
        permission_description: item.permission_description,
      });
    }

    return res.status(200).json({
      success: true,
      data: [...grouped].map(([group, permissions]) => ({
        permission_group: group,
        permissions,
      })),
    });
  },
);

router.get(
  '/api/v1/admin-access/:id',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res: Response) => {
    const idAccess = decodeId(req.params.id, keyhsid.idAdminAccess);
    if (!idAccess) {
      return sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [accessRows] = await pool.query(
      `SELECT aa.id_admin_access, aa.access_name, aa.access_description, aa.admin_access_status,
         aa.created, aa.updated,
         (SELECT COUNT(*) FROM admin_acct acct
          WHERE acct.id_access = aa.id_admin_access AND acct.admin_acct_status IN (0, 1)) AS admin_count
       FROM admin_access aa
       WHERE aa.id_admin_access = ? AND aa.id_master_comp = ? AND aa.admin_access_status IN (0, 1)
       LIMIT 1`,
      [idAccess, scope.idMasterComp],
    );
    const access = (accessRows as RowDataPacket[])[0];
    if (!access) return sendError(res, 404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');

    const [permissionRows] = await pool.query(
      `SELECT ap.id_admin_permission, ap.permission_key, ap.permission_name, ap.permission_group,
         ap.permission_description
       FROM admin_access_permission aap
       INNER JOIN admin_permission ap ON aap.id_admin_permission = ap.id_admin_permission
       WHERE aap.id_admin_access = ? AND ap.permission_status = 1
       ORDER BY COALESCE(ap.permission_group, 'Other') ASC, ap.permission_key ASC`,
      [idAccess],
    );
    const permissions = (permissionRows as RowDataPacket[]).map(permissionDto);

    return res.status(200).json({
      success: true,
      data: {
        id_admin_access: keyhsid.idAdminAccess.encode(access.id_admin_access),
        access_name: access.access_name,
        access_description: access.access_description,
        admin_access_status: Number(access.admin_access_status),
        status_label: Number(access.admin_access_status) === 1 ? 'Active' : 'Inactive',
        admin_count: Number(access.admin_count ?? 0),
        permission_ids: permissions.map((item) => item.id_admin_permission),
        permissions,
        created: access.created,
        updated: access.updated,
      },
    });
  },
);

export default router;
