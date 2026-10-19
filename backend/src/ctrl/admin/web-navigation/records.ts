// Navigation records: shared database reads and writes for the navigation and its menu items.
import { PoolConnection } from 'mysql2/promise';

import { HttpError } from '../../../helper/http-error.helper';

import { NavigationItemTranslation } from './input';

// The site header navigation: it cannot be deactivated or deleted (owner decision, D-3).
export const PRIMARY_NAVIGATION_KEY = 'primary';

export const assertNotPrimary = (key: unknown, change: 'deactivate' | 'delete') => {
  if (key === PRIMARY_NAVIGATION_KEY) {
    throw new HttpError(
      409,
      'WEB_NAVIGATION_PRIMARY_PROTECTED',
      `The primary navigation is the site header and cannot be ${change}d`,
    );
  }
};

/** Locks the navigation row (not deleted) and returns the requested columns, or throws 404. */
export const lockNavigation = async (
  connection: PoolConnection,
  idNavigation: number,
  idMasterComp: number,
  columns: string,
): Promise<any> => {
  const [rows] = await connection.query(
    `SELECT ${columns} FROM web_navigation
     WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_deleted_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [idNavigation, idMasterComp],
  );
  const navigation = (rows as any[])[0];
  if (!navigation) {
    throw new HttpError(404, 'WEB_NAVIGATION_NOT_FOUND', 'Web navigation not found');
  }
  return navigation;
};

/** Locks and returns the active (not deleted) items of a navigation. */
export const lockActiveItems = async (
  connection: PoolConnection,
  idNavigation: number,
  idMasterComp: number,
): Promise<any[]> => {
  const [rows] = await connection.query(
    `SELECT id_web_navigation_item, web_navigation_item_key, web_navigation_item_sort_order,
       web_navigation_item_status
     FROM web_navigation_item
     WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_item_deleted_at IS NULL
     FOR UPDATE`,
    [idNavigation, idMasterComp],
  );
  return rows as any[];
};

/**
 * A deleted item keeps its key until another item needs it: rename it to
 * "<key>__deleted_<id>" so the active item can take the key.
 */
export const releaseDeletedItemKey = async (
  connection: PoolConnection,
  idNavigation: number,
  idMasterComp: number,
  key: string,
): Promise<void> => {
  await connection.query(
    `UPDATE web_navigation_item
     SET web_navigation_item_key = CONCAT(LEFT(web_navigation_item_key, 80), '__deleted_',
       id_web_navigation_item), updated = NOW()
     WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_item_key = ?
       AND web_navigation_item_deleted_at IS NOT NULL`,
    [idNavigation, idMasterComp, key],
  );
};

export const insertItemTranslations = async (
  connection: PoolConnection,
  idItem: number,
  idMasterComp: number,
  translations: NavigationItemTranslation[],
): Promise<void> => {
  for (const translation of translations) {
    await connection.query(
      `INSERT INTO web_navigation_item_i18n
         (id_web_navigation_item, id_master_comp, web_navigation_item_locale,
          web_navigation_item_label, web_navigation_item_path, web_navigation_item_url,
          web_navigation_item_i18n_status, created, updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        idItem,
        idMasterComp,
        translation.locale,
        translation.label,
        translation.path,
        translation.url,
        translation.status,
      ],
    );
  }
};

export const readItemTranslations = async (
  connection: PoolConnection,
  idItem: number,
  idMasterComp: number,
): Promise<NavigationItemTranslation[]> => {
  const [rows] = await connection.query(
    `SELECT web_navigation_item_locale, web_navigation_item_label, web_navigation_item_path,
       web_navigation_item_url, web_navigation_item_i18n_status
     FROM web_navigation_item_i18n
     WHERE id_web_navigation_item = ? AND id_master_comp = ?
     ORDER BY web_navigation_item_locale`,
    [idItem, idMasterComp],
  );
  return (rows as any[]).map((row) => ({
    locale: row.web_navigation_item_locale,
    label: row.web_navigation_item_label,
    path: row.web_navigation_item_path,
    url: row.web_navigation_item_url,
    status: Number(row.web_navigation_item_i18n_status) as 0 | 1,
  }));
};
