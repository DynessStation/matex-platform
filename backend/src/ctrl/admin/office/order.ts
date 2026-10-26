// Order of the public offices (Contact page and footer), under /api/v1/office/public-order.
// Only public offices (active or inactive) are numbered, 1..n; internal offices keep 0.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import {
  assertSameItems,
  lockGroup,
  readOrderIds,
  SortGroup,
  writeOrder,
} from '../../../helper/sort-order.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

const { pool } = db;

const router = express.Router();

/** Public offices of the company (not deleted), numbered 1..n. */
export const publicOfficeGroup = (idMasterComp: number): SortGroup => ({
  table: 'office',
  id: 'id_office',
  column: 'public_sort_order',
  where: 'id_master_comp = ? AND is_public = 1 AND status IN (0, 1)',
  params: [idMasterComp],
});

router.get(
  '/api/v1/office/public-order',
  verifyToken,
  requirePermission('office.view'),
  onFailure('OFFICE_ORDER_LOAD_FAILED', 'Unable to load office order'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_office, office_code, office_name, city, status FROM office
       WHERE id_master_comp = ? AND is_public = 1 AND status IN (0, 1)
       ORDER BY public_sort_order, id_office`,
      [scope.idMasterComp],
    );
    return sendSuccess(res, 200, 'OFFICE_ORDER_FOUND', 'Office order loaded', {
      data: rows.map((row, index) => ({
        id: keyhsid.idOffice.encode(Number(row.id_office)),
        key: row.office_code,
        label: row.office_name,
        city: row.city,
        status: Number(row.status),
        position: index + 1,
      })),
    });
  },
);

// `ids` lists every public office once, first = position 1.
router.put(
  '/api/v1/office/public-order',
  verifyToken,
  requirePermission('office.update'),
  onFailure('OFFICE_ORDER_FAILED', 'Unable to save office order'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const ids = readOrderIds(req.body?.ids, keyhsid.idOffice, 'OFFICE_ORDER');

    await withTransaction(pool, async (connection) => {
      const group = publicOfficeGroup(scope.idMasterComp);
      const current = await lockGroup(connection, group);
      assertSameItems(current, ids, 'OFFICE_ORDER');
      await writeOrder(connection, group, ids);
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'office.public_reordered',
        category: 'data_change',
        module: 'office',
        action: 'reorder',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'office',
        before: { ids: current.map((row) => row.id) },
        after: { ids },
        metadata: { item_count: ids.length },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'OFFICE_ORDER_SAVED', 'Office order saved', {
      item_count: ids.length,
    });
  },
);

export default router;
