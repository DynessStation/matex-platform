// Reorder all menu items of a navigation at once.
import express = require('express');
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

import { lockActiveItems, lockNavigation } from './records';

const { pool } = db;

const router = express.Router();

const incomplete = () =>
  new HttpError(
    409,
    'WEB_NAVIGATION_REORDER_INCOMPLETE',
    'Reorder payload must contain every active navigation item',
  );

// The payload must list every active item exactly once, each with a unique sort order.
router.put(
  '/api/v1/web-navigation/:id/reorder-items',
  verifyToken,
  requirePermission('web_navigation.update'),
  onFailure('WEB_NAVIGATION_REORDER_FAILED', 'Unable to reorder navigation items'),
  async (req: AuthRequest, res: Response) => {
    const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
    if (!idNavigation) {
      return sendError(res, 400, 'WEB_NAVIGATION_INVALID_ID', 'Invalid web navigation identifier');
    }
    if (!Array.isArray(req.body?.items)) {
      return sendError(
        res,
        400,
        'WEB_NAVIGATION_REORDER_ITEMS_REQUIRED',
        'Navigation items are required',
      );
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const itemCount = await withTransaction(pool, async (connection) => {
      const navigation = await lockNavigation(
        connection,
        idNavigation,
        scope.idMasterComp,
        'web_navigation_name',
      );
      const current = await lockActiveItems(connection, idNavigation, scope.idMasterComp);
      if (req.body.items.length !== current.length) throw incomplete();

      const currentIds = new Set(current.map((item) => Number(item.id_web_navigation_item)));
      const requested: { idItem: number; sortOrder: number }[] = [];
      for (const raw of req.body.items) {
        const idItem = decodeId(raw?.id_web_navigation_item, keyhsid.idWebNavigationItem);
        if (!idItem || !currentIds.has(idItem)) {
          throw new HttpError(
            400,
            'WEB_NAVIGATION_REORDER_ITEM_INVALID',
            'Reorder payload contains an invalid navigation item',
          );
        }
        if (requested.some((item) => item.idItem === idItem)) {
          throw new HttpError(
            400,
            'WEB_NAVIGATION_REORDER_ITEM_DUPLICATE',
            'Reorder payload contains a duplicate navigation item',
          );
        }
        const sortOrder = Number(raw?.sort_order);
        if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2147483647) {
          throw new HttpError(
            400,
            'WEB_NAVIGATION_REORDER_SORT_INVALID',
            'Reorder payload contains an invalid sort order',
          );
        }
        requested.push({ idItem, sortOrder });
      }
      if ([...currentIds].some((id) => !requested.some((item) => item.idItem === id))) {
        throw incomplete();
      }
      if (new Set(requested.map((item) => item.sortOrder)).size !== requested.length) {
        throw new HttpError(
          400,
          'WEB_NAVIGATION_REORDER_SORT_DUPLICATE',
          'Navigation items cannot share the same sort order',
        );
      }

      for (const item of requested) {
        await connection.query(
          `UPDATE web_navigation_item
           SET web_navigation_item_sort_order = ?, id_updated_by = ?, updated = NOW()
           WHERE id_web_navigation_item = ? AND id_web_navigation = ? AND id_master_comp = ?
             AND web_navigation_item_deleted_at IS NULL`,
          [item.sortOrder, scope.idAdminAcct, item.idItem, idNavigation, scope.idMasterComp],
        );
      }

      const keyById = new Map(
        current.map((item) => [
          Number(item.id_web_navigation_item),
          String(item.web_navigation_item_key),
        ]),
      );
      const byId = (a: { id_web_navigation_item: number }, b: { id_web_navigation_item: number }) =>
        a.id_web_navigation_item - b.id_web_navigation_item;
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation_items.reordered',
        category: 'data_change',
        module: 'web_navigation',
        action: 'reorder',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation',
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          items: current
            .map((item) => ({
              id_web_navigation_item: Number(item.id_web_navigation_item),
              key: item.web_navigation_item_key,
              sort_order: Number(item.web_navigation_item_sort_order),
            }))
            .sort(byId),
        },
        after: {
          items: requested
            .map((item) => ({
              id_web_navigation_item: item.idItem,
              key: keyById.get(item.idItem) ?? null,
              sort_order: item.sortOrder,
            }))
            .sort(byId),
        },
        metadata: { item_count: requested.length },
        httpStatus: 200,
      });

      return requested.length;
    });

    return sendSuccess(
      res,
      200,
      'WEB_NAVIGATION_ITEMS_REORDERED',
      'Navigation items reordered successfully',
      { item_count: itemCount },
    );
  },
);

export default router;
