// Option lists for the admin-account form: company, office, chair, and access profile.
// They need a session but no permission: the form uses them for whoever may open it.
import express = require('express');
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { parseListQuery } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';

const { pool } = db;

const router = express.Router();

interface SelectSource {
  /** FROM ... WHERE ... for count and data; `?` placeholders filled by params(). */
  from: string;
  params: (idMasterComp: number, scope: AdminScope, searchValue: string) => unknown[];
  columns: string;
  orderBy: string;
  option: (row: any) => { value: string; label: string; data: Record<string, unknown> };
}

/**
 * GET /api/v1/admin-acct/select/<name>: options of the admin's own company.
 * With `byCompany`, the client passes ?id_master_comp=, which must be the admin's company.
 */
const selectRoute = (name: string, byCompany: boolean, source: SelectSource) =>
  router.get(
    `/api/v1/admin-acct/select/${name}`,
    verifyToken,
    async (req: AuthRequest, res: Response) => {
      let requestedCompany: number | null = null;
      if (byCompany) {
        const value = req.query.id_master_comp;
        if (typeof value !== 'string' || !value) {
          return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_REQUIRED', 'Company is required');
        }
        requestedCompany = decodeId(value, keyhsid.idMasterCompany);
        if (!requestedCompany) {
          return sendError(
            res,
            400,
            'ADMIN_ACCOUNT_COMPANY_INVALID_ID',
            'Invalid company identifier',
          );
        }
      }

      const scope = await getAdminScope(req);
      if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
      if (requestedCompany !== null && requestedCompany !== scope.idMasterComp) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
          'You do not have access to this company',
        );
      }

      const idMasterComp = requestedCompany ?? scope.idMasterComp;
      const { page, limit, offset, searchValue } = parseListQuery(req.query, {
        defaultLimit: 20,
        maxLimit: 50,
      });
      const params = source.params(idMasterComp, scope, searchValue);

      const [totalRows] = await pool.query(`SELECT COUNT(*) AS total ${source.from}`, params);
      const total = Number((totalRows as any[])[0]?.total ?? 0);
      const [rows] = await pool.query(
        `SELECT ${source.columns} ${source.from} ORDER BY ${source.orderBy} LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      const data = (rows as any[]).map(source.option);

      return res.status(200).json({
        success: true,
        data,
        pagination: { page, limit, total, has_more: offset + data.length < total },
      });
    },
  );

selectRoute('company', false, {
  from: `FROM master_comp WHERE id_master_comp = ? AND comp_status = 1
    AND (comp_name LIKE ? OR comp_alias LIKE ?)`,
  params: (company, _scope, search) => [company, search, search],
  columns: 'id_master_comp, comp_name, comp_alias',
  orderBy: 'comp_name ASC',
  option: (row) => ({
    value: keyhsid.idMasterCompany.encode(row.id_master_comp),
    label: row.comp_name,
    data: { alias: row.comp_alias },
  }),
});

// Office-scoped admins only see their own office.
selectRoute('office', true, {
  from: `FROM office WHERE status = 1 AND id_master_comp = ? AND (? = 1 OR id_office = ?)
    AND (office_name LIKE ? OR address LIKE ?)`,
  params: (company, scope, search) => [company, scope.isAllAccess, scope.idOffice, search, search],
  columns: 'id_office, office_name, address',
  orderBy: 'office_name ASC',
  option: (row) => ({
    value: keyhsid.idOffice.encode(row.id_office),
    label: row.office_name,
    data: { address: row.address },
  }),
});

selectRoute('chair', true, {
  from: `FROM chair WHERE id_master_comp = ? AND chair_status = 1
    AND (chair_name LIKE ? OR COALESCE(chair_description, '') LIKE ?)`,
  params: (company, _scope, search) => [company, search, search],
  columns: 'id_chair, chair_name, chair_description',
  orderBy: 'chair_name ASC',
  option: (row) => ({
    value: keyhsid.idChair.encode(row.id_chair),
    label: row.chair_name,
    data: { description: row.chair_description },
  }),
});

selectRoute('access', true, {
  from: `FROM admin_access WHERE id_master_comp = ? AND admin_access_status = 1
    AND access_name LIKE ?`,
  params: (company, _scope, search) => [company, search],
  columns: 'id_admin_access, access_name, access_description',
  orderBy: 'access_name ASC',
  option: (row) => ({
    value: keyhsid.idAdminAccess.encode(row.id_admin_access),
    label: row.access_name,
    data: { description: row.access_description },
  }),
});

export default router;
