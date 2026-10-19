// Access-profile list, permission matrix, and detail (in that order: /permission-matrix before /:id).
import express = require('express');
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { sendError } from '../../../helper/api-response.helper';

import { getSessionScope, decodeAdminAccessId } from './scope';

const { pool } = db;

const router = express.Router();

// List query helper

const getListQuery = (query: any) => {
  const parsedPage = typeof query.page === 'string' && query.page !== '' ? Number(query.page) : 1;

  const parsedLimit =
    typeof query.limit === 'string' && query.limit !== '' ? Number(query.limit) : 15;

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 15;

  const offset = (page - 1) * limit;

  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const searchValue = `%${search}%`;

  return {
    page,
    limit,
    offset,
    search,
    searchValue,
  };
};

// Admin access - get list

router.get(
  '/api/v1/admin-access',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res) => {
    try {
      // Session

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      // Query

      const { page, limit, offset, searchValue } = getListQuery(req.query);

      // Sorting

      const order = typeof req.query.ord === 'string' ? req.query.ord : '';

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: 'aa.id_admin_access',
        access_name: 'aa.access_name',
        permission_count: 'permission_count',
        admin_count: 'admin_count',
        created: 'aa.created',
        updated: 'aa.updated',
      };

      const orderQuery = allowedOrder[order] ?? 'aa.id_admin_access';

      const sortQuery = sort === 'desc' || sort === 'true' ? 'DESC' : 'ASC';

      // Count

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_access aa

            WHERE aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)
              AND (
                aa.access_name LIKE ?
                OR COALESCE(
                  aa.access_description,
                  ''
                ) LIKE ?
              )
          `,
        [scope.idMasterComp, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      // Data

      const [rows] = await pool.query(
        `
            SELECT
              aa.id_admin_access,

              aa.access_name,

              aa.access_description,

              aa.admin_access_status,

              aa.created,

              aa.updated,

              COUNT(
                DISTINCT ap.id_admin_permission
              ) AS permission_count,

              COUNT(
                DISTINCT acct.id_admin_acct
              ) AS admin_count

            FROM admin_access aa

            LEFT JOIN admin_access_permission aap
              ON aa.id_admin_access =
                aap.id_admin_access

            LEFT JOIN admin_permission ap
              ON aap.id_admin_permission =
                ap.id_admin_permission
              AND ap.permission_status = 1

            LEFT JOIN admin_acct acct
              ON aa.id_admin_access =
                acct.id_access
              AND acct.admin_acct_status IN (0, 1)

            WHERE aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)
              AND (
                aa.access_name LIKE ?
                OR COALESCE(
                  aa.access_description,
                  ''
                ) LIKE ?
              )

            GROUP BY
              aa.id_admin_access,
              aa.access_name,
              aa.access_description,
              aa.admin_access_status,
              aa.created,
              aa.updated

            ORDER BY
              ${orderQuery}
              ${sortQuery}

            LIMIT ?
            OFFSET ?
          `,
        [scope.idMasterComp, searchValue, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
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

      // Response

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          length: data.length,
          pagerows: Math.ceil(total / limit),
          total_pages: Math.ceil(total / limit),
          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error('Get admin access list error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

// Admin access - permission matrix
//
// IMPORTANT:
// Route ini HARUS berada sebelum /:id
// supaya "permission-matrix" tidak dianggap ID.

router.get(
  '/api/v1/admin-access/permission-matrix',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res) => {
    try {
      // Session

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      // Active global permissions

      const [rows] = await pool.query(
        `
            SELECT
              id_admin_permission,

              permission_key,

              permission_name,

              permission_group,

              permission_description

            FROM admin_permission

            WHERE permission_status = 1

            ORDER BY
              COALESCE(
                permission_group,
                'Other'
              ) ASC,

              permission_key ASC
          `,
      );

      const permissionRows = rows as any[];

      // Group matrix

      const grouped = new Map<string, any[]>();

      for (const item of permissionRows) {
        const group = item.permission_group ? String(item.permission_group).trim() : 'Other';

        if (!grouped.has(group)) {
          grouped.set(group, []);
        }

        grouped.get(group)!.push({
          id_admin_permission: keyhsid.idAdminPermission.encode(item.id_admin_permission),
          permission_key: item.permission_key,
          permission_name: item.permission_name,
          permission_description: item.permission_description,
        });
      }

      const data = Array.from(grouped.entries()).map(([group, permissions]) => ({
        permission_group: group,
        permissions,
      }));

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get permission matrix error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

// Admin access - get detail

router.get(
  '/api/v1/admin-access/:id',
  verifyToken,
  requirePermission('admin_access.view'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Access ID

      const idAccess = decodeAdminAccessId(id);

      if (!idAccess) {
        return sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
      }

      // Session

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      // Access

      const [accessRows] = await pool.query(
        `
            SELECT
              aa.id_admin_access,

              aa.access_name,

              aa.access_description,

              aa.admin_access_status,

              aa.created,

              aa.updated,

              (
                SELECT
                  COUNT(*)

                FROM admin_acct acct

                WHERE acct.id_access =
                  aa.id_admin_access
                  AND acct.admin_acct_status IN (0, 1)
              ) AS admin_count

            FROM admin_access aa

            WHERE aa.id_admin_access = ?
              AND aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)

            LIMIT 1
          `,
        [idAccess, scope.idMasterComp],
      );

      const accesses = accessRows as any[];

      if (!accesses.length) {
        return sendError(res, 404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');
      }

      const access = accesses[0];

      // Permissions

      const [permissionRows] = await pool.query(
        `
            SELECT
              ap.id_admin_permission,

              ap.permission_key,

              ap.permission_name,

              ap.permission_group,

              ap.permission_description

            FROM admin_access_permission aap

            INNER JOIN admin_permission ap
              ON aap.id_admin_permission =
                ap.id_admin_permission

            WHERE aap.id_admin_access = ?
              AND ap.permission_status = 1

            ORDER BY
              COALESCE(
                ap.permission_group,
                'Other'
              ) ASC,

              ap.permission_key ASC
          `,
        [idAccess],
      );

      const permissions = (permissionRows as any[]).map((item) => ({
        id_admin_permission: keyhsid.idAdminPermission.encode(item.id_admin_permission),
        permission_key: item.permission_key,
        permission_name: item.permission_name,
        permission_group: item.permission_group,
        permission_description: item.permission_description,
      }));

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
    } catch (error) {
      console.error('Get admin access detail error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

export default router;
