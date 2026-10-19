// Create an admin account.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import { assertAccountReferences, assertAccountUnique, readAccountInput } from './input';

const { pool } = db;

const router = express.Router();

/** A random 9-digit account number not used by any account. */
const newAccountUuid = async (connection: PoolConnection): Promise<number> => {
  for (;;) {
    const uuid = Math.floor(100000000 + Math.random() * 900000000);
    const [rows] = await connection.query(
      'SELECT id_admin_acct FROM admin_acct WHERE uuid = ? LIMIT 1',
      [uuid],
    );
    if (!(rows as unknown[]).length) return uuid;
  }
};

router.post(
  '/api/v1/admin-acct',
  verifyToken,
  requirePermission('admin_account.create'),
  async (req: AuthRequest, res: Response) => {
    const input = readAccountInput(req.body, { withPassword: true });

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    if (input.idMasterComp !== scope.idMasterComp) {
      throw new HttpError(
        403,
        'ADMIN_ACCOUNT_CREATE_COMPANY_SCOPE_FORBIDDEN',
        'You cannot create an account outside your company',
      );
    }
    if (scope.isAllAccess !== 1 && input.idOffice !== scope.idOffice) {
      throw new HttpError(
        403,
        'ADMIN_ACCOUNT_CREATE_OFFICE_SCOPE_FORBIDDEN',
        'You cannot create an account outside your assigned office',
      );
    }
    if (input.isAllAccess === 1 && scope.isAllAccess !== 1) {
      throw new HttpError(
        403,
        'ADMIN_ACCOUNT_FULL_ACCESS_GRANT_FORBIDDEN',
        'You are not allowed to grant full company access',
      );
    }

    const idAdminAcct = await withTransaction(pool, async (connection) => {
      const idProfilePhoto = await assertAccountReferences(connection, input, scope.isAllAccess);
      await assertAccountUnique(connection, input);

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO admin_acct
           (id_master_comp, id_office, password, name, alias, email_1, email_2, phone_1, phone_2,
            id_profile_photo, uuid, id_chair, id_access, is_all_access, fcm, created, updated,
            admin_acct_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW(), 1)`,
        [
          input.idMasterComp,
          input.idOffice,
          await bcrypt.hash(input.password as string, 12),
          input.name,
          input.alias,
          input.email1,
          input.email2,
          input.phone1,
          input.phone2,
          idProfilePhoto,
          await newAccountUuid(connection),
          input.idChair,
          input.idAccess,
          input.isAllAccess,
        ],
      );
      const id = Number(insert.insertId);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: input.idMasterComp,
        eventCode: 'admin_account.created',
        category: 'data_change',
        module: 'admin_account',
        action: 'create',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: id,
        entityLabel: input.name,
        after: {
          id_master_comp: input.idMasterComp,
          id_office: input.idOffice,
          name: input.name,
          alias: input.alias,
          email_1: input.email1,
          email_2: input.email2,
          phone_1: input.phone1,
          phone_2: input.phone2,
          id_profile_photo: idProfilePhoto,
          id_chair: input.idChair,
          id_access: input.idAccess,
          is_all_access: input.isAllAccess,
          admin_acct_status: 1,
        },
        httpStatus: 201,
      });

      return id;
    });

    return sendSuccess(res, 201, 'ADMIN_ACCOUNT_CREATED', 'Admin account created successfully', {
      id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
    });
  },
);

export default router;
