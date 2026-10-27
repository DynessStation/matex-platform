// Navigation menu items: create, update, and delete.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';

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

import { NavigationItemInput, readNavigationItemInput } from './input';
import {
  insertItemTranslations,
  lockActiveItems,
  lockNavigation,
  readItemTranslations,
  releaseDeletedItemKey,
} from './records';

const { pool } = db;

const router = express.Router();

const ITEM_ALREADY_EXISTS = {
  code: 'WEB_NAVIGATION_ITEM_ALREADY_EXISTS',
  message: 'Navigation item key or translation is already in use',
};
const keyInUse = () =>
  new HttpError(409, 'WEB_NAVIGATION_ITEM_KEY_EXISTS', 'Navigation item key is already in use');
const itemNotFound = () =>
  new HttpError(404, 'WEB_NAVIGATION_ITEM_NOT_FOUND', 'Navigation item not found');

/** The navigation id, and the item id when the route has one; sends 400 and returns null if invalid. */
const readIds = (req: AuthRequest, res: Response, withItem: boolean) => {
  const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
  const idItem = withItem ? decodeId(req.params.itemId, keyhsid.idWebNavigationItem) : 0;
  if (!idNavigation) {
    sendError(res, 400, 'WEB_NAVIGATION_INVALID_ID', 'Invalid web navigation identifier');
    return null;
  }
  if (withItem && !idItem) {
    sendError(res, 400, 'WEB_NAVIGATION_ITEM_INVALID_ID', 'Invalid navigation item identifier');
    return null;
  }
  return { idNavigation, idItem: idItem as number };
};

const auditLabel = (item: NavigationItemInput, defaultLocale: string) =>
  item.translations.find((translation) => translation.locale === defaultLocale)?.label ?? item.key;

router.post(
  '/api/v1/web-navigation/:id/items',
  verifyToken,
  requirePermission('web_navigation.create'),
  onFailure('WEB_NAVIGATION_ITEM_CREATE_FAILED', 'Unable to create navigation item', {
    duplicate: ITEM_ALREADY_EXISTS,
  }),
  async (req: AuthRequest, res: Response) => {
    const ids = readIds(req, res, false);
    if (!ids) return;

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const idItem = await withTransaction(pool, async (connection) => {
      const navigation = await lockNavigation(
        connection,
        ids.idNavigation,
        scope.idMasterComp,
        'web_navigation_name, web_navigation_default_locale',
      );
      const item = readNavigationItemInput(
        req.body,
        String(navigation.web_navigation_default_locale),
      );

      await releaseDeletedItemKey(connection, ids.idNavigation, scope.idMasterComp, item.key);
      const [existing] = await connection.query(
        `SELECT id_web_navigation_item FROM web_navigation_item
         WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_item_key = ?
           AND web_navigation_item_deleted_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [ids.idNavigation, scope.idMasterComp, item.key],
      );
      if ((existing as unknown[]).length) throw keyInUse();

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO web_navigation_item
           (id_web_navigation, id_master_comp, web_navigation_item_key,
            web_navigation_item_sort_order, web_navigation_item_status, id_created_by,
            id_updated_by, created, updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          ids.idNavigation,
          scope.idMasterComp,
          item.key,
          item.sortOrder,
          item.status,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      const id = Number(insert.insertId);
      await insertItemTranslations(connection, id, scope.idMasterComp, item.translations);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation_item.created',
        category: 'data_change',
        module: 'web_navigation',
        action: 'create',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation_item',
        entityId: id,
        entityLabel: auditLabel(item, navigation.web_navigation_default_locale),
        after: {
          id_web_navigation: ids.idNavigation,
          key: item.key,
          sort_order: item.sortOrder,
          status: item.status,
          translations: item.translations,
        },
        metadata: { navigation_name: navigation.web_navigation_name },
        httpStatus: 201,
      });

      return id;
    });

    return sendSuccess(
      res,
      201,
      'WEB_NAVIGATION_ITEM_CREATED',
      'Navigation item created successfully',
      {
        id_web_navigation_item: keyhsid.idWebNavigationItem.encode(idItem),
      },
    );
  },
);

router.put(
  '/api/v1/web-navigation/:id/items/:itemId',
  verifyToken,
  requirePermission('web_navigation.update'),
  onFailure('WEB_NAVIGATION_ITEM_UPDATE_FAILED', 'Unable to update navigation item', {
    duplicate: ITEM_ALREADY_EXISTS,
  }),
  async (req: AuthRequest, res: Response) => {
    const ids = readIds(req, res, true);
    if (!ids) return;

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const navigation = await lockNavigation(
        connection,
        ids.idNavigation,
        scope.idMasterComp,
        'web_navigation_name, web_navigation_default_locale',
      );
      const items = await lockActiveItems(connection, ids.idNavigation, scope.idMasterComp);
      const current = items.find((row) => Number(row.id_web_navigation_item) === ids.idItem);
      if (!current) throw itemNotFound();

      const item = readNavigationItemInput(
        req.body,
        String(navigation.web_navigation_default_locale),
      );
      await releaseDeletedItemKey(connection, ids.idNavigation, scope.idMasterComp, item.key);
      const keyTaken = items.some(
        (row) =>
          Number(row.id_web_navigation_item) !== ids.idItem &&
          row.web_navigation_item_key === item.key,
      );
      if (keyTaken) throw keyInUse();

      const translationsBefore = await readItemTranslations(
        connection,
        ids.idItem,
        scope.idMasterComp,
      );

      await connection.query(
        `UPDATE web_navigation_item
         SET web_navigation_item_key = ?, web_navigation_item_sort_order = ?,
           web_navigation_item_status = ?, id_updated_by = ?, updated = NOW()
         WHERE id_web_navigation_item = ? AND id_web_navigation = ? AND id_master_comp = ?
           AND web_navigation_item_deleted_at IS NULL`,
        [
          item.key,
          item.sortOrder,
          item.status,
          scope.idAdminAcct,
          ids.idItem,
          ids.idNavigation,
          scope.idMasterComp,
        ],
      );
      await connection.query(
        'DELETE FROM web_navigation_item_i18n WHERE id_web_navigation_item = ? AND id_master_comp = ?',
        [ids.idItem, scope.idMasterComp],
      );
      await insertItemTranslations(connection, ids.idItem, scope.idMasterComp, item.translations);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation_item.updated',
        category: 'data_change',
        module: 'web_navigation',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation_item',
        entityId: ids.idItem,
        entityLabel: auditLabel(item, navigation.web_navigation_default_locale),
        before: {
          id_web_navigation: ids.idNavigation,
          key: current.web_navigation_item_key,
          sort_order: Number(current.web_navigation_item_sort_order),
          status: Number(current.web_navigation_item_status),
          translations: translationsBefore,
        },
        after: {
          id_web_navigation: ids.idNavigation,
          key: item.key,
          sort_order: item.sortOrder,
          status: item.status,
          translations: item.translations,
        },
        metadata: { navigation_name: navigation.web_navigation_name },
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      'WEB_NAVIGATION_ITEM_UPDATED',
      'Navigation item updated successfully',
      {
        id_web_navigation_item: keyhsid.idWebNavigationItem.encode(ids.idItem),
      },
    );
  },
);

router.delete(
  '/api/v1/web-navigation/:id/items/:itemId',
  verifyToken,
  requirePermission('web_navigation.delete'),
  onFailure('WEB_NAVIGATION_ITEM_DELETE_FAILED', 'Unable to delete navigation item'),
  async (req: AuthRequest, res: Response) => {
    const ids = readIds(req, res, true);
    if (!ids) return;

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const navigation = await lockNavigation(
        connection,
        ids.idNavigation,
        scope.idMasterComp,
        'web_navigation_name',
      );
      const items = await lockActiveItems(connection, ids.idNavigation, scope.idMasterComp);
      const target = items.find((row) => Number(row.id_web_navigation_item) === ids.idItem);
      if (!target) throw itemNotFound();

      await connection.query(
        `UPDATE web_navigation_item
         SET web_navigation_item_status = 0, web_navigation_item_deleted_at = NOW(),
           id_updated_by = ?, updated = NOW()
         WHERE id_master_comp = ? AND id_web_navigation = ? AND id_web_navigation_item IN (?)
           AND web_navigation_item_deleted_at IS NULL`,
        [scope.idAdminAcct, scope.idMasterComp, ids.idNavigation, ids.idItem],
      );

      const deleted = {
        id_web_navigation_item: Number(target.id_web_navigation_item),
        key: target.web_navigation_item_key,
        sort_order: Number(target.web_navigation_item_sort_order),
        status: Number(target.web_navigation_item_status),
      };
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation_item.deleted',
        category: 'data_change',
        module: 'web_navigation',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation_item',
        entityId: ids.idItem,
        entityLabel: target.web_navigation_item_key,
        before: { items: [deleted] },
        after: { items: [{ ...deleted, status: 0, deleted_at: 'set' }] },
        metadata: { navigation_name: navigation.web_navigation_name, deleted_item_count: 1 },
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      'WEB_NAVIGATION_ITEM_DELETED',
      'Navigation item deleted successfully',
      { id: req.params.itemId },
    );
  },
);

export default router;
