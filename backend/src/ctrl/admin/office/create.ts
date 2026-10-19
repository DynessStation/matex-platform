// Create an office.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { adminHasPermission, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import {
  assertOfficeUnique,
  OFFICE_COLUMNS,
  officeColumnValues,
  officeCoreAudit,
  officePublicationAudit,
  readOfficeInput,
} from './input';
import {
  insertOfficeAttachments,
  insertOperatingHours,
  resolveOfficeAttachments,
  toAuditOfficeAttachments,
  toAuditOperatingHours,
} from './relations';

const { pool } = db;

const router = express.Router();

router.post(
  '/api/v1/office',
  verifyToken,
  requirePermission('office.create'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readOfficeInput(req.body);

    const idOffice = await withTransaction(pool, async (connection) => {
      const requestsPhotos = Array.isArray(input.attachments) && input.attachments.length > 0;
      if (requestsPhotos && !(await adminHasPermission(scope, 'attachment.view', connection))) {
        throw new HttpError(
          403,
          'OFFICE_ATTACHMENT_ACCESS_DENIED',
          'Attachment access is required to assign office media',
        );
      }
      const attachments = await resolveOfficeAttachments(
        connection,
        scope.idMasterComp,
        input.attachments,
      );
      await assertOfficeUnique(connection, scope.idMasterComp, input);

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO office (id_master_comp, ${OFFICE_COLUMNS.join(', ')}, created, updated, status)
         VALUES (?, ${OFFICE_COLUMNS.map(() => '?').join(', ')}, NOW(), NOW(), 1)`,
        [scope.idMasterComp, ...officeColumnValues(input)],
      );
      const id = Number(insert.insertId);

      await insertOperatingHours(connection, id, input.operatingHours);
      await insertOfficeAttachments(connection, id, attachments);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'office.created',
        category: 'data_change',
        module: 'office',
        action: 'create',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'office',
        entityId: id,
        entityLabel: input.name,
        after: {
          ...officeCoreAudit(input),
          ...officePublicationAudit(input),
          operating_hours: toAuditOperatingHours(input.operatingHours),
          attachments: toAuditOfficeAttachments(attachments),
          status: 1,
        },
        httpStatus: 201,
      });

      return id;
    });

    return sendSuccess(res, 201, 'OFFICE_CREATED', 'Office created successfully', {
      id_office: keyhsid.idOffice.encode(idOffice),
    });
  },
);

export default router;
