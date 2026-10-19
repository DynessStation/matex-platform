// Option lists for the admin-account form: company, office, chair, and access profile.
import express = require('express');
import keyhsid from '../../../hsid';
import db = require('../../../db');

import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { sendError } from '../../../helper/api-response.helper';

const { pool } = db;

const router = express.Router();

// Select query helper

const getSelectQuery = (query: any) => {
  const parsedPage = typeof query.page === 'string' && query.page !== '' ? Number(query.page) : 1;

  const parsedLimit =
    typeof query.limit === 'string' && query.limit !== '' ? Number(query.limit) : 20;

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;

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

// Admin account - select company

router.get('/api/v1/admin-acct/select/company', verifyToken, async (req: AuthRequest, res) => {
  try {
    // Session

    const sessionAdminId = req.user?.id_admin_acct;

    if (!sessionAdminId) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const [sessionRows] = await pool.query(
      `
            SELECT
              id_master_comp,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
      [sessionAdminId],
    );

    const sessionUsers = sessionRows as any[];

    if (!sessionUsers.length) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const sessionUser = sessionUsers[0];

    if (Number(sessionUser.admin_acct_status) !== 1) {
      return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
    }

    const idMasterComp = Number(sessionUser.id_master_comp);

    // Query params

    const { page, limit, offset, searchValue } = getSelectQuery(req.query);

    // Count

    const [totalRows] = await pool.query(
      `
            SELECT
              COUNT(*) AS total

            FROM master_comp

            WHERE id_master_comp = ?
              AND comp_status = 1
              AND (
                comp_name LIKE ?
                OR comp_alias LIKE ?
              )
          `,
      [idMasterComp, searchValue, searchValue],
    );

    const total = Number((totalRows as any[])[0]?.total ?? 0);

    // Data

    const [rows] = await pool.query(
      `
            SELECT
              id_master_comp,
              comp_name,
              comp_alias

            FROM master_comp

            WHERE id_master_comp = ?
              AND comp_status = 1
              AND (
                comp_name LIKE ?
                OR comp_alias LIKE ?
              )

            ORDER BY comp_name ASC

            LIMIT ?
            OFFSET ?
          `,
      [idMasterComp, searchValue, searchValue, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      value: keyhsid.idMasterCompany.encode(item.id_master_comp),
      label: item.comp_name,
      data: {
        alias: item.comp_alias,
      },
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + data.length < total,
      },
    });
  } catch (error) {
    console.error('Company select query error:', error);

    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }
});

// Admin account - select office

router.get('/api/v1/admin-acct/select/office', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { id_master_comp } = req.query;

    // Company param

    if (typeof id_master_comp !== 'string' || !id_master_comp) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_REQUIRED', 'Company is required');
    }

    const decodedMasterComp = keyhsid.idMasterCompany.decode(id_master_comp)[0];

    const idMasterComp = Number(decodedMasterComp);

    if (!decodedMasterComp || !Number.isInteger(idMasterComp) || idMasterComp <= 0) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_INVALID_ID', 'Invalid company identifier');
    }

    // Session

    const sessionAdminId = req.user?.id_admin_acct;

    if (!sessionAdminId) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const [sessionRows] = await pool.query(
      `
            SELECT
              id_master_comp,
              id_office,
              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
      [sessionAdminId],
    );

    const sessionUsers = sessionRows as any[];

    if (!sessionUsers.length) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const sessionUser = sessionUsers[0];

    if (Number(sessionUser.admin_acct_status) !== 1) {
      return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
    }

    // Company hard boundary

    if (idMasterComp !== Number(sessionUser.id_master_comp)) {
      return sendError(
        res,
        403,
        'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
        'You do not have access to this company',
      );
    }

    // Query params

    const { page, limit, offset, searchValue } = getSelectQuery(req.query);

    const isAllAccess = Number(sessionUser.is_all_access);

    const sessionOffice = Number(sessionUser.id_office);

    // Count

    const [totalRows] = await pool.query(
      `
            SELECT
              COUNT(*) AS total

            FROM office

            WHERE status = 1
              AND id_master_comp = ?
              AND (
                ? = 1
                OR id_office = ?
              )
              AND (
                office_name LIKE ?
                OR address LIKE ?
              )
          `,
      [idMasterComp, isAllAccess, sessionOffice, searchValue, searchValue],
    );

    const total = Number((totalRows as any[])[0]?.total ?? 0);

    // Data

    const [rows] = await pool.query(
      `
            SELECT
              id_office,
              office_name,
              address

            FROM office

            WHERE status = 1
              AND id_master_comp = ?
              AND (
                ? = 1
                OR id_office = ?
              )
              AND (
                office_name LIKE ?
                OR address LIKE ?
              )

            ORDER BY
              office_name ASC

            LIMIT ?
            OFFSET ?
          `,
      [idMasterComp, isAllAccess, sessionOffice, searchValue, searchValue, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      value: keyhsid.idOffice.encode(item.id_office),
      label: item.office_name,
      data: {
        address: item.address,
      },
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + data.length < total,
      },
    });
  } catch (error) {
    console.error('Office select query error:', error);

    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }
});

// Admin account - select chair

router.get('/api/v1/admin-acct/select/chair', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { id_master_comp } = req.query;

    // Company param

    if (typeof id_master_comp !== 'string' || !id_master_comp) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_REQUIRED', 'Company is required');
    }

    const decodedMasterComp = keyhsid.idMasterCompany.decode(id_master_comp)[0];

    const idMasterComp = Number(decodedMasterComp);

    if (!decodedMasterComp || !Number.isInteger(idMasterComp) || idMasterComp <= 0) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_INVALID_ID', 'Invalid company identifier');
    }

    // Session

    const sessionAdminId = req.user?.id_admin_acct;

    if (!sessionAdminId) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const [sessionRows] = await pool.query(
      `
            SELECT
              id_master_comp,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
      [sessionAdminId],
    );

    const sessionUsers = sessionRows as any[];

    if (!sessionUsers.length) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const sessionUser = sessionUsers[0];

    if (Number(sessionUser.admin_acct_status) !== 1) {
      return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
    }

    // Company hard boundary

    if (idMasterComp !== Number(sessionUser.id_master_comp)) {
      return sendError(
        res,
        403,
        'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
        'You do not have access to this company',
      );
    }

    // Query params

    const { page, limit, offset, searchValue } = getSelectQuery(req.query);

    // Count

    const [totalRows] = await pool.query(
      `
            SELECT
              COUNT(*) AS total

            FROM chair

            WHERE id_master_comp = ?
              AND chair_status = 1
              AND (
                chair_name LIKE ?
                OR COALESCE(
                  chair_description,
                  ''
                ) LIKE ?
              )
          `,
      [idMasterComp, searchValue, searchValue],
    );

    const total = Number((totalRows as any[])[0]?.total ?? 0);

    // Data

    const [rows] = await pool.query(
      `
            SELECT
              id_chair,
              chair_name,
              chair_description

            FROM chair

            WHERE id_master_comp = ?
              AND chair_status = 1
              AND (
                chair_name LIKE ?
                OR COALESCE(
                  chair_description,
                  ''
                ) LIKE ?
              )

            ORDER BY chair_name ASC

            LIMIT ?
            OFFSET ?
          `,
      [idMasterComp, searchValue, searchValue, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      value: keyhsid.idChair.encode(item.id_chair),
      label: item.chair_name,
      data: {
        description: item.chair_description,
      },
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + data.length < total,
      },
    });
  } catch (error) {
    console.error('Chair select query error:', error);

    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }
});

// Admin account - select access

router.get('/api/v1/admin-acct/select/access', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { id_master_comp } = req.query;

    // Company param

    if (typeof id_master_comp !== 'string' || !id_master_comp) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_REQUIRED', 'Company is required');
    }

    const decodedMasterComp = keyhsid.idMasterCompany.decode(id_master_comp)[0];

    const idMasterComp = Number(decodedMasterComp);

    if (!decodedMasterComp || !Number.isInteger(idMasterComp) || idMasterComp <= 0) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_COMPANY_INVALID_ID', 'Invalid company identifier');
    }

    // Session

    const sessionAdminId = req.user?.id_admin_acct;

    if (!sessionAdminId) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const [sessionRows] = await pool.query(
      `
            SELECT
              id_master_comp,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
      [sessionAdminId],
    );

    const sessionUsers = sessionRows as any[];

    if (!sessionUsers.length) {
      return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    }

    const sessionUser = sessionUsers[0];

    if (Number(sessionUser.admin_acct_status) !== 1) {
      return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
    }

    // Company hard boundary

    if (idMasterComp !== Number(sessionUser.id_master_comp)) {
      return sendError(
        res,
        403,
        'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
        'You do not have access to this company',
      );
    }

    // Query params

    const { page, limit, offset, searchValue } = getSelectQuery(req.query);

    // Count

    const [totalRows] = await pool.query(
      `
            SELECT
              COUNT(*) AS total

            FROM admin_access

            WHERE id_master_comp = ?
              AND admin_access_status = 1
              AND access_name LIKE ?
          `,
      [idMasterComp, searchValue],
    );

    const total = Number((totalRows as any[])[0]?.total ?? 0);

    // Data

    const [rows] = await pool.query(
      `
            SELECT
              id_admin_access,
              access_name,
              access_description

            FROM admin_access

            WHERE id_master_comp = ?
              AND admin_access_status = 1
              AND access_name LIKE ?

            ORDER BY
              access_name ASC

            LIMIT ?
            OFFSET ?
          `,
      [idMasterComp, searchValue, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      value: keyhsid.idAdminAccess.encode(item.id_admin_access),
      label: item.access_name,
      data: {
        description: item.access_description,
      },
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + data.length < total,
      },
    });
  } catch (error) {
    console.error('Access select query error:', error);

    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }
});

export default router;
