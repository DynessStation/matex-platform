// Delete (soft delete) an office.
import express = require('express');
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';

import { getSessionScope, decodeOfficeId } from './scope';
import { toAuditOperatingHours, toAuditOfficeAttachments } from './relations';

const { pool } = db;

const router = express.Router();

// Office - delete

router.delete(
  '/api/v1/office/:id',
  verifyToken,
  requirePermission('office.delete'),
  async (req: AuthRequest, res) => {
    let connection: any = null;

    try {
      const idOffice = decodeOfficeId(req.params.id);

      if (!idOffice) {
        return sendError(res, 400, 'OFFICE_INVALID_ID', 'Invalid office identifier');
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      // Target

      const [officeRows] = await connection.query(
        `
            SELECT
              id_office,

              office_code,
              office_name,
              office_description,

              address,
              city,
              province,
              postal_code,

              email,
              phone,

              lat,
              lng,

              attendance_enabled,
              attendance_radius_meter,

              website_url,

              is_public,
              public_slug,
              public_sort_order,

              google_place_id,
              google_maps_url,
              google_business_url,

              status

            FROM office

            WHERE id_office = ?

              AND id_master_comp = ?

              AND status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idOffice, scope.idMasterComp],
      );

      const offices = officeRows as any[];

      if (!offices.length) {
        await connection.rollback();

        return sendError(res, 404, 'OFFICE_NOT_FOUND', 'Office not found');
      }

      const office = offices[0];

      // Must be inactive

      if (Number(office.status) !== 0) {
        await connection.rollback();
        return sendError(
          res,
          409,
          'OFFICE_MUST_BE_INACTIVE',
          'Deactivate the office before deleting it',
        );
      }

      // Admin references

      const [accountRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?

              AND id_office = ?

              AND admin_acct_status
                IN (0, 1)
          `,
        [scope.idMasterComp, idOffice],
      );

      const references = Number((accountRows as any[])[0]?.total ?? 0);

      if (references > 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          'OFFICE_HAS_ADMIN_REFERENCES',
          'Office is still assigned to one or more admin accounts',
          {
            assigned_accounts: references,
          },
        );
      }

      // Operating hours before delete

      const [hourRows] = await connection.query(
        `
      SELECT
        day_of_week,

        sequence,

        open_time,

        close_time,

        is_closed

      FROM office_operating_hour

      WHERE id_office = ?

      ORDER BY
        day_of_week ASC,
        sequence ASC
    `,
        [idOffice],
      );

      // Attachments before delete

      const [attachmentRows] = await connection.query(
        `
      SELECT
        id_attachment,

        attachment_role,

        caption,

        sort_order,

        is_public

      FROM office_attachment

      WHERE id_office = ?

      ORDER BY
        CASE
          WHEN attachment_role =
            'cover'
          THEN 0
          ELSE 1
        END ASC,

        sort_order ASC,

        id_attachment ASC
    `,
        [idOffice],
      );

      const auditHours = toAuditOperatingHours(hourRows as any[]);

      const auditAttachments = toAuditOfficeAttachments(attachmentRows as any[]);

      // Audit before

      const auditBefore = {
        office_code: office.office_code,
        office_name: office.office_name,
        office_description: office.office_description ?? null,
        address: office.address ?? null,
        city: office.city ?? null,
        province: office.province ?? null,
        postal_code: office.postal_code ?? null,
        email: office.email ?? null,
        phone: office.phone ?? null,
        lat: office.lat === null ? null : Number(office.lat),
        lng: office.lng === null ? null : Number(office.lng),
        attendance_enabled: Number(office.attendance_enabled),
        attendance_radius_meter:
          office.attendance_radius_meter === null ? null : Number(office.attendance_radius_meter),
        website_url: office.website_url ?? null,
        is_public: Number(office.is_public),
        public_slug: office.public_slug ?? null,
        public_sort_order: Number(office.public_sort_order ?? 0),
        google_place_id: office.google_place_id ?? null,
        google_maps_url: office.google_maps_url ?? null,
        google_business_url: office.google_business_url ?? null,
        operating_hours: auditHours,
        attachments: auditAttachments,
        status: Number(office.status),
      };

      // Detach media

      await connection.query(
        `
          DELETE FROM office_attachment

          WHERE id_office = ?
        `,
        [idOffice],
      );

      // Delete operating hours

      await connection.query(
        `
          DELETE FROM office_operating_hour

          WHERE id_office = ?
        `,
        [idOffice],
      );

      // Soft delete office

      await connection.query(
        `
          UPDATE office

          SET
            status = 99,

            updated = NOW()

          WHERE id_office = ?

            AND id_master_comp = ?
        `,
        [idOffice, scope.idMasterComp],
      );

      // Audit

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
        before: auditBefore,
        after: {
          ...auditBefore,
          operating_hours: [],
          attachments: [],
          status: 99,
        },
        metadata: {
          delete_type: 'soft_delete',
          removed_operating_hours: auditHours.length,
          removed_attachment_ids: auditAttachments.map((item) => item.id_attachment),
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(res, 200, 'OFFICE_DELETED', 'Office deleted successfully', {
        id_office: keyhsid.idOffice.encode(idOffice),
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('Delete office error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

export default router;
