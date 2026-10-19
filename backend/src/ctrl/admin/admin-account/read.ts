// Admin-account list and detail.
import express = require('express');
import keyhsid from '../../../hsid';
import db = require('../../../db');

import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { sendError } from '../../../helper/api-response.helper';
import { sortColumn } from '../../../helper/list-query.helper';

const { pool } = db;

const router = express.Router();

// get accounts
router.get(
  '/api/v1/admin-acct',
  verifyToken,
  requirePermission('admin_account.view'),
  async (req: AuthRequest, res) => {
    const { query } = req;

    let { page, search, limit, ord: order, srt: sort } = query;

    try {
      // Auth account

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      // Get account scope

      const [sessionRows] = await pool.query(
        `
        SELECT
            id_master_comp,
            id_office,
            is_all_access

        FROM admin_acct

        WHERE id_admin_acct = ?
            AND admin_acct_status = 1

        LIMIT 1
    `,
        [idAdminAcct],
      );

      const sessionUsers = sessionRows as any[];

      if (sessionUsers.length === 0) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      const idMasterComp = sessionUsers[0].id_master_comp;

      const idOffice = sessionUsers[0].id_office;

      // Full-access admins see every office of the company; others only their own office.
      const isAllAccess = Number(sessionUsers[0].is_all_access);

      // Pagination

      const parsedPage = typeof page === 'string' && page !== '' ? Number(page) : NaN;

      const parsedLimit = typeof limit === 'string' && limit !== '' ? Number(limit) : 10;

      const pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const itemsPerPage =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10;

      const offset = (pageNumber - 1) * itemsPerPage;

      // Sorting

      const allowedOrder: Record<string, string> = {
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

      const orderQuery = sortColumn(allowedOrder, order, 'aa.id_admin_acct');

      const sortQuery = sort === 'true' ? 'DESC' : 'ASC';

      // Search

      const searchTerm = typeof search === 'string' ? search.trim() : '';

      const searchValue = `%${searchTerm}%`;

      // Count total data

      const qGetTotal = `
                SELECT
                    COUNT(*) AS total

                FROM admin_acct aa

                WHERE (
                    aa.name LIKE ?
                    OR aa.email_1 LIKE ?
                    OR aa.email_2 LIKE ?
                    OR aa.phone_1 LIKE ?
                    OR aa.phone_2 LIKE ?
                    OR aa.alias LIKE ?
                    OR aa.uuid LIKE ?
                )

                AND aa.id_master_comp = ?
                AND (? = 1 OR aa.id_office = ?)
                AND aa.admin_acct_status IN (0, 1)
            `;

      const [totalRows] = await pool.query(qGetTotal, [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        idMasterComp,
        isAllAccess,
        idOffice,
      ]);

      const totalData = Number((totalRows as any[])[0].total);

      // Get data

      const qGetData = `
                SELECT
                    aa.id_admin_acct,

                    mc.id_master_comp,
                    mc.comp_name,
                    mc.comp_alias,

                    o.id_office,
                    o.office_name,

                    aa.name,
                    aa.alias,
                    aa.email_1,
                    aa.email_2,
                    aa.phone_1,
                    aa.phone_2,
                    aa.uuid,

                    aa.id_profile_photo,

                    pa.id_attachment AS profile_attachment_id,
                    pa.collection_name AS profile_collection_name,
                    pa.name AS profile_name,
                    pa.original_name AS profile_original_name,
                    pa.file_name AS profile_file_name,
                    pa.mime_type AS profile_mime_type,
                    pa.extension AS profile_extension,
                    pa.disk AS profile_disk,
                    pa.storage_path AS profile_storage_path,
                    pa.file_size AS profile_file_size,
                    pa.width AS profile_width,
                    pa.height AS profile_height,

                    ch.id_chair,
                    ch.chair_name,
                    ch.chair_description,

                    ac.id_admin_access,
                    ac.access_name,

                    aa.is_all_access,
                    aa.admin_acct_status,
                    aa.created,
                    aa.updated

                FROM admin_acct aa

                INNER JOIN master_comp mc
                    ON aa.id_master_comp = mc.id_master_comp

                INNER JOIN office o
                    ON aa.id_office = o.id_office

                INNER JOIN chair ch
                    ON aa.id_chair = ch.id_chair

                INNER JOIN admin_access ac
                    ON aa.id_access = ac.id_admin_access

                LEFT JOIN attachment pa
                    ON aa.id_profile_photo = pa.id_attachment
                    AND pa.collection_name = 'admin_profile'
                    AND pa.attachment_status = 1
                    AND pa.deleted_at IS NULL
                WHERE (
                    aa.name LIKE ?
                    OR aa.email_1 LIKE ? 
                    OR aa.email_2 LIKE ?
                    OR aa.phone_1 LIKE ?
                    OR aa.phone_2 LIKE ?
                    OR aa.alias LIKE ?
                    OR aa.uuid LIKE ?
                )

                AND aa.id_master_comp = ?
                AND (? = 1 OR aa.id_office = ?)
                AND aa.admin_acct_status IN (0, 1)

                ORDER BY ${orderQuery} ${sortQuery}

                LIMIT ? OFFSET ?
            `;

      const [rows] = await pool.query(qGetData, [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        idMasterComp,
        isAllAccess,
        idOffice,
        itemsPerPage,
        offset,
      ]);

      // Response data

      const data = (rows as any[]).map((item) => {
        // Profile photo

        const profilePhoto = item.profile_attachment_id
          ? {
              id_attachment: keyhsid.idAttachment.encode(item.profile_attachment_id),
              collection_name: item.profile_collection_name,
              name: item.profile_name,
              original_name: item.profile_original_name,
              file_name: item.profile_file_name,
              mime_type: item.profile_mime_type,
              extension: item.profile_extension,
              disk: item.profile_disk,
              storage_path: item.profile_storage_path,
              file_size: Number(item.profile_file_size),
              width: item.profile_width,
              height: item.profile_height,
              asset_url: buildAttachmentUrl(item.profile_storage_path),
            }
          : null;

        // Response

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

      // Pagination response

      const pagerows = Math.ceil(totalData / itemsPerPage);

      return res.status(200).json({
        success: true,
        data: data,
        pagination: {
          total: totalData,
          page: pageNumber,
          limit: itemsPerPage,
          length: (rows as any[]).length,
          pagerows: pagerows,
        },
      });
    } catch (error) {
      console.error('Database query error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

// Admin account - get detail

router.get(
  '/api/v1/admin-acct/:id',
  verifyToken,
  requirePermission('admin_account.view'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Decode admin account ID

      const decodedAdminAcct = keyhsid.idAdmin.decode(id as string)[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (!decodedAdminAcct || !Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');
      }

      // Get admin account

      const qGetData = `
                SELECT
                    aa.id_admin_acct,

                    aa.id_master_comp,
                    mc.comp_name,
                    mc.comp_alias,

                    aa.id_office,
                    o.office_name,

                    aa.id_chair,
                    ch.chair_name,
                    ch.chair_description,

                    aa.id_access,
                    ac.access_name,

                    aa.name,
                    aa.alias,

                    aa.email_1,
                    aa.email_2,

                    aa.phone_1,
                    aa.phone_2,

                    aa.id_profile_photo,

                    pa.id_attachment AS profile_attachment_id,
                    pa.collection_name AS profile_collection_name,
                    pa.name AS profile_name,
                    pa.original_name AS profile_original_name,
                    pa.file_name AS profile_file_name,
                    pa.mime_type AS profile_mime_type,
                    pa.extension AS profile_extension,
                    pa.disk AS profile_disk,
                    pa.storage_path AS profile_storage_path,
                    pa.file_size AS profile_file_size,
                    pa.width AS profile_width,
                    pa.height AS profile_height,

                    aa.is_all_access,

                    aa.created,
                    aa.updated,

                    aa.admin_acct_status

                FROM admin_acct aa

                INNER JOIN master_comp mc
                    ON aa.id_master_comp = mc.id_master_comp

                INNER JOIN office o
                    ON aa.id_office = o.id_office

                INNER JOIN chair ch
                    ON aa.id_chair = ch.id_chair

                INNER JOIN admin_access ac
                    ON aa.id_access = ac.id_admin_access

                LEFT JOIN attachment pa
                    ON aa.id_profile_photo = pa.id_attachment
                    AND pa.collection_name = 'admin_profile'
                    AND pa.attachment_status = 1
                    AND pa.deleted_at IS NULL

                WHERE aa.id_admin_acct = ?
                    AND aa.admin_acct_status IN (0, 1)

                LIMIT 1
            `;

      const [rows] = await pool.query(qGetData, [idAdminAcct]);

      const dataRows = rows as any[];

      if (dataRows.length === 0) {
        return sendError(res, 404, 'ADMIN_ACCOUNT_NOT_FOUND', 'Admin account not found');
      }

      const account = dataRows[0];

      // Session scope

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

      if (Number(account.id_master_comp) !== Number(sessionUser.id_master_comp)) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
          'You do not have access to this company account',
        );
      }

      // Office scope

      if (
        Number(sessionUser.is_all_access) !== 1 &&
        Number(account.id_office) !== Number(sessionUser.id_office)
      ) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN',
          'You do not have access to this office account',
        );
      }

      // Response

      const profilePhoto = account.profile_attachment_id
        ? {
            id_attachment: keyhsid.idAttachment.encode(account.profile_attachment_id),
            collection_name: account.profile_collection_name,
            name: account.profile_name,
            original_name: account.profile_original_name,
            file_name: account.profile_file_name,
            mime_type: account.profile_mime_type,
            extension: account.profile_extension,
            disk: account.profile_disk,
            storage_path: account.profile_storage_path,
            file_size: Number(account.profile_file_size),
            width: account.profile_width,
            height: account.profile_height,
            asset_url: buildAttachmentUrl(account.profile_storage_path),
          }
        : null;

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
    } catch (error) {
      console.error('Get admin account detail error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

export default router;
