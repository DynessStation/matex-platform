// Navigation list and detail.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { parseJsonValue } from '../../../helper/json.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

const { pool } = db;

const router = express.Router();

router.get(
  '/api/v1/web-navigation',
  verifyToken,
  requirePermission('web_navigation.view'),
  onFailure('WEB_NAVIGATION_LIST_UNAVAILABLE', 'Unable to load web navigation'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query(
      `SELECT navigation.id_web_navigation, navigation.web_navigation_key,
         navigation.web_navigation_name, navigation.web_navigation_location,
         navigation.web_navigation_default_locale, navigation.web_navigation_status,
         navigation.created, navigation.updated,
         COUNT(item.id_web_navigation_item) AS item_count,
         SUM(CASE WHEN item.web_navigation_item_status = 1 THEN 1 ELSE 0 END) AS active_item_count
       FROM web_navigation navigation
       LEFT JOIN web_navigation_item item ON item.id_web_navigation = navigation.id_web_navigation
         AND item.id_master_comp = navigation.id_master_comp
         AND item.web_navigation_item_deleted_at IS NULL
       WHERE navigation.id_master_comp = ? AND navigation.web_navigation_deleted_at IS NULL
       GROUP BY navigation.id_web_navigation, navigation.web_navigation_key,
         navigation.web_navigation_name, navigation.web_navigation_location,
         navigation.web_navigation_default_locale, navigation.web_navigation_status,
         navigation.created, navigation.updated
       ORDER BY navigation.web_navigation_location, navigation.web_navigation_name,
         navigation.id_web_navigation`,
      [scope.idMasterComp],
    );

    const navigations = (rows as RowDataPacket[]).map((row) => ({
      id_web_navigation: keyhsid.idWebNavigation.encode(Number(row.id_web_navigation)),
      key: row.web_navigation_key,
      name: row.web_navigation_name,
      location: row.web_navigation_location,
      default_locale: row.web_navigation_default_locale,
      status: Number(row.web_navigation_status),
      item_count: Number(row.item_count ?? 0),
      active_item_count: Number(row.active_item_count ?? 0),
      created: row.created,
      updated: row.updated,
    }));

    return sendSuccess(res, 200, 'WEB_NAVIGATION_LIST_FOUND', 'Web navigation loaded', {
      navigations,
    });
  },
);

router.get(
  '/api/v1/web-navigation/:id',
  verifyToken,
  requirePermission('web_navigation.view'),
  onFailure('WEB_NAVIGATION_UNAVAILABLE', 'Unable to load web navigation'),
  async (req: AuthRequest, res: Response) => {
    const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
    if (!idNavigation) {
      return sendError(res, 400, 'WEB_NAVIGATION_INVALID_ID', 'Invalid web navigation identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [navigationRows] = await pool.query(
      `SELECT id_web_navigation, web_navigation_key, web_navigation_name, web_navigation_location,
         web_navigation_default_locale, web_navigation_status, web_navigation_settings_json,
         created, updated
       FROM web_navigation
       WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_deleted_at IS NULL
       LIMIT 1`,
      [idNavigation, scope.idMasterComp],
    );
    const navigation = (navigationRows as RowDataPacket[])[0];
    if (!navigation) {
      return sendError(res, 404, 'WEB_NAVIGATION_NOT_FOUND', 'Web navigation not found');
    }

    const [itemRows] = await pool.query(
      `SELECT id_web_navigation_item, web_navigation_item_key, web_navigation_item_sort_order,
         web_navigation_item_status, created, updated
       FROM web_navigation_item
       WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_item_deleted_at IS NULL
       ORDER BY web_navigation_item_sort_order, id_web_navigation_item`,
      [idNavigation, scope.idMasterComp],
    );

    const [translationRows] = await pool.query(
      `SELECT translation.id_web_navigation_item, translation.web_navigation_item_locale,
         translation.web_navigation_item_label, translation.web_navigation_item_path,
         translation.web_navigation_item_url, translation.web_navigation_item_i18n_status
       FROM web_navigation_item_i18n translation
       INNER JOIN web_navigation_item item
         ON item.id_web_navigation_item = translation.id_web_navigation_item
         AND item.id_master_comp = translation.id_master_comp
       WHERE item.id_web_navigation = ? AND item.id_master_comp = ?
         AND item.web_navigation_item_deleted_at IS NULL
       ORDER BY translation.id_web_navigation_item, translation.web_navigation_item_locale`,
      [idNavigation, scope.idMasterComp],
    );

    const translationsByItem = new Map<number, unknown[]>();
    for (const row of translationRows as RowDataPacket[]) {
      const itemId = Number(row.id_web_navigation_item);
      const translations = translationsByItem.get(itemId) ?? [];
      translations.push({
        locale: row.web_navigation_item_locale,
        label: row.web_navigation_item_label,
        path: row.web_navigation_item_path,
        url: row.web_navigation_item_url,
        status: Number(row.web_navigation_item_i18n_status),
      });
      translationsByItem.set(itemId, translations);
    }

    return sendSuccess(res, 200, 'WEB_NAVIGATION_FOUND', 'Web navigation loaded', {
      id_web_navigation: keyhsid.idWebNavigation.encode(Number(navigation.id_web_navigation)),
      key: navigation.web_navigation_key,
      name: navigation.web_navigation_name,
      location: navigation.web_navigation_location,
      default_locale: navigation.web_navigation_default_locale,
      status: Number(navigation.web_navigation_status),
      settings: parseJsonValue(navigation.web_navigation_settings_json),
      items: (itemRows as RowDataPacket[]).map((item) => {
        const itemId = Number(item.id_web_navigation_item);
        return {
          id_web_navigation_item: keyhsid.idWebNavigationItem.encode(itemId),
          key: item.web_navigation_item_key,
          sort_order: Number(item.web_navigation_item_sort_order),
          status: Number(item.web_navigation_item_status),
          translations: translationsByItem.get(itemId) ?? [],
          created: item.created,
          updated: item.updated,
        };
      }),
      created: navigation.created,
      updated: navigation.updated,
    });
  },
);

export default router;
