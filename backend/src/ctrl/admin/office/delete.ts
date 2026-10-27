// Delete (soft delete) an office.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { renumber } from '../../../helper/sort-order.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import { OFFICE_COLUMNS, officeCoreAuditFromRow, officePublicationAuditFromRow } from './input';
import { publicOfficeGroup } from './order';
import {
  readOfficeAttachmentLinks,
  readOfficeHours,
  toAuditOfficeAttachments,
  toAuditOperatingHours,
} from './records';

const { pool } = db;

const router = express.Router();

// Only an inactive office without assigned admins can be deleted. Its photos and hours are
// removed; the office row is kept with status 99.
router.delete(
  '/api/v1/office/:id',
  verifyToken,
  requirePermission('office.delete'),
  async (req: AuthRequest, res: Response) => {
    const idOffice = decodeId(req.params.id, keyhsid.idOffice);
    if (!idOffice) return sendError(res, 400, 'OFFICE_INVALID_ID', 'Invalid office identifier');

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const [officeRows] = await connection.query(
        `SELECT id_office, ${OFFICE_COLUMNS.join(', ')}, status
         FROM office
         WHERE id_office = ? AND id_master_comp = ? AND status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idOffice, scope.idMasterComp],
      );
      const office = (officeRows as RowDataPacket[])[0];
      if (!office) throw new HttpError(404, 'OFFICE_NOT_FOUND', 'Office not found');
      if (Number(office.status) !== 0) {
        throw new HttpError(
          409,
          'OFFICE_MUST_BE_INACTIVE',
          'Deactivate the office before deleting it',
        );
      }

      const [accountRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM admin_acct
         WHERE id_master_comp = ? AND id_office = ? AND admin_acct_status IN (0, 1)`,
        [scope.idMasterComp, idOffice],
      );
      const assignedAccounts = Number((accountRows as RowDataPacket[])[0]?.total ?? 0);
      if (assignedAccounts > 0) {
        throw new HttpError(
          409,
          'OFFICE_HAS_ADMIN_REFERENCES',
          'Office is still assigned to one or more admin accounts',
          { assigned_accounts: assignedAccounts },
        );
      }

      const hours = toAuditOperatingHours(await readOfficeHours(connection, idOffice));
      const attachments = toAuditOfficeAttachments(
        await readOfficeAttachmentLinks(connection, idOffice),
      );
      const core = officeCoreAuditFromRow(office);
      const publication = officePublicationAuditFromRow(office);
      const before = {
        office_code: core.office_code,
        office_name: core.office_name,
        office_description: core.office_description,
        address: core.address,
        city: core.city,
        province: core.province,
        postal_code: core.postal_code,
        email: core.email,
        phone: core.phone,
        lat: core.lat,
        lng: core.lng,
        attendance_enabled: core.attendance_enabled,
        attendance_radius_meter: core.attendance_radius_meter,
        ...publication,
        google_place_id: core.google_place_id,
        google_maps_url: core.google_maps_url,
        google_business_url: core.google_business_url,
        operating_hours: hours,
        attachments,
        status: Number(office.status),
      };

      await connection.query('DELETE FROM office_attachment WHERE id_office = ?', [idOffice]);
      await connection.query('DELETE FROM office_operating_hour WHERE id_office = ?', [idOffice]);
      await connection.query(
        'UPDATE office SET status = 99, updated = NOW() WHERE id_office = ? AND id_master_comp = ?',
        [idOffice, scope.idMasterComp],
      );
      if (Number(office.is_public) === 1) {
        await renumber(connection, publicOfficeGroup(scope.idMasterComp));
      }

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'office.deleted',
        category: 'data_change',
        module: 'office',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'office',
        entityId: idOffice,
        entityLabel: office.office_name,
        before,
        after: { ...before, operating_hours: [], attachments: [], status: 99 },
        metadata: {
          delete_type: 'soft_delete',
          removed_operating_hours: hours.length,
          removed_attachment_ids: attachments.map((item) => item.id_attachment),
        },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'OFFICE_DELETED', 'Office deleted successfully', {
      id_office: keyhsid.idOffice.encode(idOffice),
    });
  },
);

export default router;
