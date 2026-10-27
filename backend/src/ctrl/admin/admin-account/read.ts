// Admin-account list and detail.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { parseListQuery, sortColumn, countOf } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import {
  AccountRow,
  assertAccountInScope,
  PROFILE_PHOTO_COLUMNS,
  PROFILE_PHOTO_JOIN,
  profilePhotoDto,
} from './records';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  id: 'aa.id_admin_acct',
  name: 'aa.name',
  alias: 'aa.alias',
  email_1: 'aa.email_1',
  email_2: 'aa.email_2',
  phone_1: 'aa.phone_1',
  phone_2: 'aa.phone_2',
  created: 'aa.created',
  updated: 'aa.updated',
};

// Full-access admins see every office of the company; others only their own office.
const WHERE = `(aa.name LIKE ? OR aa.email_1 LIKE ? OR aa.email_2 LIKE ? OR aa.phone_1 LIKE ?
    OR aa.phone_2 LIKE ? OR aa.alias LIKE ? OR aa.uuid LIKE ?)
  AND aa.id_master_comp = ? AND (? = 1 OR aa.id_office = ?) AND aa.admin_acct_status IN (0, 1)`;

const JOINS = `INNER JOIN master_comp mc ON aa.id_master_comp = mc.id_master_comp
  INNER JOIN office o ON aa.id_office = o.id_office
  INNER JOIN chair ch ON aa.id_chair = ch.id_chair
  INNER JOIN admin_access ac ON aa.id_access = ac.id_admin_access
  ${PROFILE_PHOTO_JOIN}`;

router.get(
  '/api/v1/admin-acct',
  verifyToken,
  requirePermission('admin_account.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const { page, limit, offset, searchValue } = parseListQuery(req.query, { defaultLimit: 10 });
    const orderBy = sortColumn(SORTABLE, req.query.ord, 'aa.id_admin_acct');
    const direction = req.query.srt === 'true' ? 'DESC' : 'ASC';
    const params = [
      ...Array(7).fill(searchValue),
      scope.idMasterComp,
      scope.isAllAccess,
      scope.idOffice,
    ];

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_acct aa WHERE ${WHERE}`,
      params,
    );
    const total = Number((totalRows as RowDataPacket[])[0].total);
    // Rows before search and filters, for "x of y" in the admin table.
    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM admin_acct aa
       WHERE aa.id_master_comp = ? AND (? = 1 OR aa.id_office = ?) AND aa.admin_acct_status IN (0, 1)`,
      [scope.idMasterComp, scope.isAllAccess, scope.idOffice],
    );

    const [rows] = await pool.query(
      `SELECT aa.id_admin_acct, mc.id_master_comp, mc.comp_name, mc.comp_alias, o.id_office,
         o.office_name, aa.name, aa.alias, aa.email_1, aa.email_2, aa.phone_1, aa.phone_2, aa.uuid,
         aa.id_profile_photo, ${PROFILE_PHOTO_COLUMNS}, ch.id_chair, ch.chair_name,
         ch.chair_description, ac.id_admin_access, ac.access_name, aa.is_all_access,
         aa.admin_acct_status, aa.created, aa.updated
       FROM admin_acct aa
       ${JOINS}
       WHERE ${WHERE}
       ORDER BY ${orderBy} ${direction}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // The rows are spread into the response as they are (including raw columns) to keep the
    // current response shape; see the response-format decision in docs/peta-jalan.md (5D).
    const data = (rows as RowDataPacket[]).map((item) => {
      const profilePhoto = profilePhotoDto(item);
      return {
        ...item,
        id_admin_acct: keyhsid.idAdmin.encode(item.id_admin_acct),
        id_master_comp: keyhsid.idMasterCompany.encode(item.id_master_comp),
        id_office: keyhsid.idOffice.encode(item.id_office),
        id_chair: keyhsid.idChair.encode(item.id_chair),
        id_admin_access: keyhsid.idAdminAccess.encode(item.id_admin_access),
        id_profile_photo: profilePhoto?.id_attachment ?? null,
        profile_photo: profilePhoto,
        status_label: item.admin_acct_status === 1 ? 'Active' : 'Inactive',
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        total_all: totalAll,
        page,
        limit,
        length: data.length,
        pagerows: Math.ceil(total / limit),
      },
    });
  },
);

router.get(
  '/api/v1/admin-acct/:id',
  verifyToken,
  requirePermission('admin_account.view'),
  async (req: AuthRequest, res: Response) => {
    const idAdminAcct = decodeId(req.params.id, keyhsid.idAdmin);
    if (!idAdminAcct) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');
    }

    const [rows] = await pool.query(
      `SELECT aa.id_admin_acct, aa.id_master_comp, mc.comp_name, mc.comp_alias, aa.id_office,
         o.office_name, aa.id_chair, ch.chair_name, ch.chair_description, aa.id_access,
         ac.access_name, aa.name, aa.alias, aa.email_1, aa.email_2, aa.phone_1, aa.phone_2,
         aa.id_profile_photo, ${PROFILE_PHOTO_COLUMNS}, aa.is_all_access, aa.created, aa.updated,
         aa.admin_acct_status
       FROM admin_acct aa
       ${JOINS}
       WHERE aa.id_admin_acct = ? AND aa.admin_acct_status IN (0, 1)
       LIMIT 1`,
      [idAdminAcct],
    );
    const account = (rows as AccountRow[])[0];
    if (!account) return sendError(res, 404, 'ADMIN_ACCOUNT_NOT_FOUND', 'Admin account not found');

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    assertAccountInScope(account, scope);

    const profilePhoto = profilePhotoDto(account);
    return res.status(200).json({
      success: true,
      data: {
        id_admin_acct: keyhsid.idAdmin.encode(account.id_admin_acct),
        name: account.name,
        alias: account.alias,
        email_1: account.email_1,
        email_2: account.email_2,
        phone_1: account.phone_1,
        phone_2: account.phone_2,
        id_profile_photo: profilePhoto?.id_attachment ?? null,
        profile_photo: profilePhoto,
        master_comp: {
          id_master_comp: keyhsid.idMasterCompany.encode(account.id_master_comp),
          comp_name: account.comp_name,
          comp_alias: account.comp_alias,
        },
        office: {
          id_office: keyhsid.idOffice.encode(account.id_office),
          office_name: account.office_name,
        },
        chair: {
          id_chair: keyhsid.idChair.encode(account.id_chair),
          chair_name: account.chair_name,
          chair_description: account.chair_description,
        },
        access: {
          id_access: keyhsid.idAdminAccess.encode(account.id_access),
          access_name: account.access_name,
        },
        is_all_access: account.is_all_access,
        admin_acct_status: account.admin_acct_status,
        created: account.created,
        updated: account.updated,
      },
    });
  },
);

export default router;
