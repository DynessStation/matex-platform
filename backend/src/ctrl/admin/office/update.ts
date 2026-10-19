// Update an office and change its status.
import express = require('express');
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { adminHasPermission, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import {
  assertOfficeUnique,
  OFFICE_COLUMNS,
  officeColumnValues,
  officeCoreAudit,
  officeCoreAuditFromRow,
  officePublicationAudit,
  officePublicationAuditFromRow,
  readOfficeInput,
} from './input';
import {
  getOfficeAttachmentDiff,
  insertOfficeAttachments,
  insertOperatingHours,
  isSameAuditValue,
  readOfficeAttachmentLinks,
  readOfficeHours,
  resolveOfficeAttachments,
  toAuditOfficeAttachments,
  toAuditOperatingHours,
} from './records';

const { pool } = db;

const router = express.Router();

const officeNotFound = () => new HttpError(404, 'OFFICE_NOT_FOUND', 'Office not found');

router.put(
  '/api/v1/office/:id',
  verifyToken,
  requirePermission('office.update'),
  async (req: AuthRequest, res: Response) => {
    const idOffice = decodeId(req.params.id, keyhsid.idOffice);
    if (!idOffice) return sendError(res, 400, 'OFFICE_INVALID_ID', 'Invalid office identifier');

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readOfficeInput(req.body);

    await withTransaction(pool, async (connection) => {
      const [officeRows] = await connection.query(
        `SELECT id_office, ${OFFICE_COLUMNS.join(', ')}, status
         FROM office
         WHERE id_office = ? AND id_master_comp = ? AND status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idOffice, scope.idMasterComp],
      );
      const current = (officeRows as any[])[0];
      if (!current) throw officeNotFound();

      const currentHours = await readOfficeHours(connection, idOffice);
      const currentAttachments = await readOfficeAttachmentLinks(connection, idOffice);
      const attachments = await resolveOfficeAttachments(
        connection,
        scope.idMasterComp,
        input.attachments,
      );
      await assertOfficeUnique(connection, scope.idMasterComp, input, idOffice);

      const coreBefore = officeCoreAuditFromRow(current);
      const coreAfter = officeCoreAudit(input);
      const publicationBefore = officePublicationAuditFromRow(current);
      const publicationAfter = officePublicationAudit(input);
      const hoursBefore = toAuditOperatingHours(currentHours);
      const hoursAfter = toAuditOperatingHours(input.operatingHours);
      const attachmentsBefore = toAuditOfficeAttachments(currentAttachments);
      const attachmentsAfter = toAuditOfficeAttachments(attachments);

      const coreChanged = !isSameAuditValue(coreBefore, coreAfter);
      const publicationChanged = !isSameAuditValue(publicationBefore, publicationAfter);
      const hoursChanged = !isSameAuditValue(hoursBefore, hoursAfter);
      const mediaChanged = !isSameAuditValue(attachmentsBefore, attachmentsAfter);

      if (mediaChanged && !(await adminHasPermission(scope, 'attachment.view', connection))) {
        throw new HttpError(
          403,
          'OFFICE_ATTACHMENT_ACCESS_DENIED',
          'Attachment access is required to modify office media',
        );
      }

      if (coreChanged || publicationChanged) {
        await connection.query(
          `UPDATE office
           SET ${OFFICE_COLUMNS.map((column) => `${column} = ?`).join(', ')}, updated = NOW()
           WHERE id_office = ? AND id_master_comp = ?`,
          [...officeColumnValues(input), idOffice, scope.idMasterComp],
        );
      }
      if (hoursChanged) {
        await connection.query('DELETE FROM office_operating_hour WHERE id_office = ?', [idOffice]);
        await insertOperatingHours(connection, idOffice, input.operatingHours);
      }
      if (mediaChanged) {
        await connection.query('DELETE FROM office_attachment WHERE id_office = ?', [idOffice]);
        await insertOfficeAttachments(connection, idOffice, attachments);
      }

      const audit = {
        req,
        connection,
        writeMode: 'strict' as const,
        idMasterComp: scope.idMasterComp,
        module: 'office',
        actorType: 'admin' as const,
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'office',
        entityId: idOffice,
        entityLabel: input.name,
        httpStatus: 200,
      };
      if (coreChanged) {
        await writeAuditLog({
          ...audit,
          eventCode: 'office.updated',
          category: 'data_change',
          action: 'update',
          before: coreBefore,
          after: coreAfter,
        });
      }
      if (publicationChanged) {
        await writeAuditLog({
          ...audit,
          eventCode: 'office.publication_changed',
          category: 'data_change',
          action: 'publication_change',
          before: publicationBefore,
          after: publicationAfter,
        });
      }
      if (hoursChanged) {
        await writeAuditLog({
          ...audit,
          eventCode: 'office.operating_hours_changed',
          category: 'data_change',
          action: 'operating_hours_change',
          before: { operating_hours: hoursBefore },
          after: { operating_hours: hoursAfter },
        });
      }
      if (mediaChanged) {
        const diff = getOfficeAttachmentDiff(attachmentsBefore, attachmentsAfter);
        await writeAuditLog({
          ...audit,
          eventCode: 'office.media_changed',
          category: 'file',
          action: 'media_change',
          before: { attachments: attachmentsBefore },
          after: { attachments: attachmentsAfter },
          metadata: {
            added_attachment_ids: diff.added,
            removed_attachment_ids: diff.removed,
          },
        });
      }
    });

    return sendSuccess(res, 200, 'OFFICE_UPDATED', 'Office updated successfully', {
      id_office: keyhsid.idOffice.encode(idOffice),
    });
  },
);

router.patch(
  '/api/v1/office/:id/status',
  verifyToken,
  requirePermission('office.update'),
  async (req: AuthRequest, res: Response) => {
    const idOffice = decodeId(req.params.id, keyhsid.idOffice);
    if (!idOffice) return sendError(res, 400, 'OFFICE_INVALID_ID', 'Invalid office identifier');

    const newStatus = Number(req.body?.status);
    if (![0, 1].includes(newStatus)) {
      return sendError(res, 400, 'OFFICE_INVALID_STATUS', 'Invalid office status');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const result = await withTransaction(pool, async (connection) => {
      const [officeRows] = await connection.query(
        `SELECT id_office, office_name, status
         FROM office
         WHERE id_office = ? AND id_master_comp = ? AND status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idOffice, scope.idMasterComp],
      );
      const office = (officeRows as any[])[0];
      if (!office) throw officeNotFound();
      if (Number(office.status) === newStatus) return { unchanged: true, affectedAccounts: 0 };

      const [accountRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM admin_acct
         WHERE id_master_comp = ? AND id_office = ? AND admin_acct_status IN (0, 1)`,
        [scope.idMasterComp, idOffice],
      );
      const affectedAccounts = Number((accountRows as any[])[0]?.total ?? 0);

      await connection.query(
        'UPDATE office SET status = ?, updated = NOW() WHERE id_office = ? AND id_master_comp = ?',
        [newStatus, idOffice, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'office.status_changed',
        category: 'data_change',
        module: 'office',
        action: 'status_change',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'office',
        entityId: idOffice,
        entityLabel: office.office_name,
        before: { status: Number(office.status) },
        after: { status: newStatus },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
        httpStatus: 200,
      });

      return { unchanged: false, affectedAccounts };
    });

    const id = keyhsid.idOffice.encode(idOffice);
    if (result.unchanged) {
      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'OFFICE_ALREADY_ACTIVE' : 'OFFICE_ALREADY_INACTIVE',
        newStatus === 1 ? 'Office is already active' : 'Office is already inactive',
        { id_office: id, status: newStatus },
      );
    }
    return sendSuccess(
      res,
      200,
      newStatus === 1 ? 'OFFICE_ACTIVATED' : 'OFFICE_DEACTIVATED',
      newStatus === 1 ? 'Office activated successfully' : 'Office deactivated successfully',
      {
        id_office: id,
        status: newStatus,
        affected_accounts: newStatus === 0 ? result.affectedAccounts : 0,
      },
    );
  },
);

export default router;
