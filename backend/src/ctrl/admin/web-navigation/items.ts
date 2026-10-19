// Navigation menu items: create, update, and delete a branch.
import express = require("express");
import { Response } from "express";
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { writeAuditLog } from "../../../helper/audit-log.helper";
import {
  decodeWebNavigationItemId,
  normalizeNavigationItemInput,
} from "../../../helper/web-navigation.helper";

import { getSessionScope, decodeNavigationId } from "./scope";

const { pool } = db;

const router = express.Router();

//==================================================
//==== WEB NAVIGATION ITEM - CREATE
//==================================================

router.post(
  "/api/v1/web-navigation/:id/items",

  verifyToken,

  requirePermission("web_navigation.create"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_name,

              web_navigation_default_locale

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      const normalized = normalizeNavigationItemInput(
        req.body,
        String(navigation.web_navigation_default_locale),
      );

      if (!normalized.success) {
        await connection.rollback();

        return sendError(res, 400, normalized.code, normalized.message);
      }

      const item = normalized.data;

      await connection.query(
        `
            UPDATE web_navigation_item

            SET
              web_navigation_item_key = CONCAT(
                LEFT(web_navigation_item_key, 80),
                '__deleted_',
                id_web_navigation_item
              ),

              updated = NOW()

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_key = ?

              AND web_navigation_item_deleted_at IS NOT NULL
          `,
        [idNavigation, scope.idMasterComp, item.key],
      );

      const [existingRows] = await connection.query(
        `
            SELECT id_web_navigation_item

            FROM web_navigation_item

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_key = ?

              AND web_navigation_item_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp, item.key],
      );

      if ((existingRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "WEB_NAVIGATION_ITEM_KEY_EXISTS",
          "Navigation item key is already in use",
        );
      }

      const [insertResult] = await connection.query(
        `
            INSERT INTO web_navigation_item
            (
              id_web_navigation,

              id_master_comp,

              web_navigation_item_key,

              web_navigation_item_sort_order,

              web_navigation_item_status,

              id_created_by,

              id_updated_by,

              created,

              updated
            )
            VALUES
            (
              ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
            )
          `,
        [
          idNavigation,
          scope.idMasterComp,
          item.key,
          item.sortOrder,
          item.status,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );

      const idItem = Number((insertResult as any).insertId);

      for (const translation of item.translations) {
        await connection.query(
          `
            INSERT INTO web_navigation_item_i18n
            (
              id_web_navigation_item,

              id_master_comp,

              web_navigation_item_locale,

              web_navigation_item_label,

              web_navigation_item_path,

              web_navigation_item_url,

              web_navigation_item_i18n_status,

              created,

              updated
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
          [
            idItem,
            scope.idMasterComp,
            translation.locale,
            translation.label,
            translation.path,
            translation.url,
            translation.status,
          ],
        );
      }

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation_item.created",
        category: "data_change",
        module: "web_navigation",
        action: "create",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation_item",
        entityId: idItem,
        entityLabel:
          item.translations.find(
            (translation) =>
              translation.locale === navigation.web_navigation_default_locale,
          )?.label ?? item.key,
        after: {
          id_web_navigation: idNavigation,
          key: item.key,
          sort_order: item.sortOrder,
          status: item.status,
          translations: item.translations,
        },
        metadata: {
          navigation_name: navigation.web_navigation_name,
        },
        httpStatus: 201,
      });

      await connection.commit();

      return sendSuccess(
        res,
        201,
        "WEB_NAVIGATION_ITEM_CREATED",
        "Navigation item created successfully",
        {
          id_web_navigation_item: keyhsid.idWebNavigationItem.encode(idItem),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      if ((error as any)?.code === "ER_DUP_ENTRY") {
        return sendError(
          res,
          409,
          "WEB_NAVIGATION_ITEM_ALREADY_EXISTS",
          "Navigation item key or translation is already in use",
        );
      }

      console.error("[Web Navigation] Failed to create navigation item", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_ITEM_CREATE_FAILED",
        "Unable to create navigation item",
      );
    } finally {
      connection?.release();
    }
  },
);

//==================================================
//==== WEB NAVIGATION ITEM - UPDATE
//==================================================

router.put(
  "/api/v1/web-navigation/:id/items/:itemId",

  verifyToken,

  requirePermission("web_navigation.update"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      const idItem = decodeWebNavigationItemId(req.params.itemId);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      if (!idItem) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_ITEM_INVALID_ID",
          "Invalid navigation item identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== NAVIGATION
      //==================================================

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_name,

              web_navigation_default_locale

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      //==================================================
      //==== LOCK ALL ITEMS FOR UPDATE VALIDATION
      //==================================================

      const [itemRows] = await connection.query(
        `
            SELECT
              id_web_navigation_item,

              web_navigation_item_key,

              web_navigation_item_sort_order,

              web_navigation_item_status

            FROM web_navigation_item

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_deleted_at
                IS NULL

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigationItems = itemRows as any[];

      const currentItem = navigationItems.find(
        (item) => Number(item.id_web_navigation_item) === idItem,
      );

      if (!currentItem) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_ITEM_NOT_FOUND",
          "Navigation item not found",
        );
      }

      //==================================================
      //==== INPUT
      //==================================================

      const normalized = normalizeNavigationItemInput(
        req.body,
        String(navigation.web_navigation_default_locale),
      );

      if (!normalized.success) {
        await connection.rollback();

        return sendError(res, 400, normalized.code, normalized.message);
      }

      const item = normalized.data;

      // Release a matching key held by an old soft-deleted item
      // before validating and updating the active item.
      await connection.query(
        `
          UPDATE web_navigation_item

          SET
            web_navigation_item_key = CONCAT(
              LEFT(web_navigation_item_key, 80),
              '__deleted_',
              id_web_navigation_item
            ),

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?

            AND web_navigation_item_key = ?

            AND web_navigation_item_deleted_at IS NOT NULL
        `,
        [idNavigation, scope.idMasterComp, item.key],
      );

      //==================================================
      //==== UNIQUE KEY
      //==================================================

      const duplicateKey = navigationItems.some(
        (candidate) =>
          Number(candidate.id_web_navigation_item) !== idItem &&
          candidate.web_navigation_item_key === item.key,
      );

      if (duplicateKey) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "WEB_NAVIGATION_ITEM_KEY_EXISTS",
          "Navigation item key is already in use",
        );
      }

      //==================================================
      //==== BEFORE TRANSLATIONS
      //==================================================

      const [beforeTranslationRows] = await connection.query(
        `
            SELECT
              web_navigation_item_locale,

              web_navigation_item_label,

              web_navigation_item_path,

              web_navigation_item_url,

              web_navigation_item_i18n_status

            FROM web_navigation_item_i18n

            WHERE id_web_navigation_item = ?

              AND id_master_comp = ?

            ORDER BY web_navigation_item_locale
          `,
        [idItem, scope.idMasterComp],
      );

      const beforeTranslations = (beforeTranslationRows as any[]).map(
        (translation) => ({
          locale: translation.web_navigation_item_locale,

          label: translation.web_navigation_item_label,

          path: translation.web_navigation_item_path,

          url: translation.web_navigation_item_url,

          status: Number(translation.web_navigation_item_i18n_status),
        }),
      );

      //==================================================
      //==== UPDATE ITEM
      //==================================================

      await connection.query(
        `
          UPDATE web_navigation_item

          SET
            web_navigation_item_key = ?,

            web_navigation_item_sort_order = ?,

            web_navigation_item_status = ?,

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation_item = ?

            AND id_web_navigation = ?

            AND id_master_comp = ?

            AND web_navigation_item_deleted_at
              IS NULL
        `,
        [
          item.key,
          item.sortOrder,
          item.status,
          scope.idAdminAcct,
          idItem,
          idNavigation,
          scope.idMasterComp,
        ],
      );

      //==================================================
      //==== REPLACE TRANSLATIONS
      //==================================================

      await connection.query(
        `
          DELETE FROM web_navigation_item_i18n

          WHERE id_web_navigation_item = ?

            AND id_master_comp = ?
        `,
        [idItem, scope.idMasterComp],
      );

      for (const translation of item.translations) {
        await connection.query(
          `
            INSERT INTO web_navigation_item_i18n
            (
              id_web_navigation_item,

              id_master_comp,

              web_navigation_item_locale,

              web_navigation_item_label,

              web_navigation_item_path,

              web_navigation_item_url,

              web_navigation_item_i18n_status,

              created,

              updated
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
          [
            idItem,
            scope.idMasterComp,
            translation.locale,
            translation.label,
            translation.path,
            translation.url,
            translation.status,
          ],
        );
      }

      //==================================================
      //==== AUDIT
      //==================================================

      const defaultTranslation = item.translations.find(
        (translation) =>
          translation.locale === navigation.web_navigation_default_locale,
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation_item.updated",
        category: "data_change",
        module: "web_navigation",
        action: "update",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation_item",
        entityId: idItem,
        entityLabel: defaultTranslation?.label ?? item.key,
        before: {
          id_web_navigation: idNavigation,
          key: currentItem.web_navigation_item_key,
          sort_order: Number(currentItem.web_navigation_item_sort_order),

          status: Number(currentItem.web_navigation_item_status),
          translations: beforeTranslations,
        },
        after: {
          id_web_navigation: idNavigation,
          key: item.key,
          sort_order: item.sortOrder,

          status: item.status,

          translations: item.translations,
        },
        metadata: {
          navigation_name: navigation.web_navigation_name,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_ITEM_UPDATED",
        "Navigation item updated successfully",
        {
          id_web_navigation_item: keyhsid.idWebNavigationItem.encode(idItem),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      if ((error as any)?.code === "ER_DUP_ENTRY") {
        return sendError(
          res,
          409,
          "WEB_NAVIGATION_ITEM_ALREADY_EXISTS",
          "Navigation item key or translation is already in use",
        );
      }

      console.error("[Web Navigation] Failed to update navigation item", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_ITEM_UPDATE_FAILED",
        "Unable to update navigation item",
      );
    } finally {
      connection?.release();
    }
  },
);

//==================================================
//==== WEB NAVIGATION ITEM - DELETE BRANCH
//==================================================

router.delete(
  "/api/v1/web-navigation/:id/items/:itemId",

  verifyToken,

  requirePermission("web_navigation.delete"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      const idItem = decodeWebNavigationItemId(req.params.itemId);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      if (!idItem) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_ITEM_INVALID_ID",
          "Invalid navigation item identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_name

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      const [itemRows] = await connection.query(
        `
            SELECT
              id_web_navigation_item,
              web_navigation_item_key,
              web_navigation_item_sort_order,

              web_navigation_item_status

            FROM web_navigation_item

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_deleted_at
                IS NULL

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigationItems = itemRows as any[];

      const target = navigationItems.find(
        (item) => Number(item.id_web_navigation_item) === idItem,
      );

      if (!target) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_ITEM_NOT_FOUND",
          "Navigation item not found",
        );
      }

      const deletedIds = [idItem];

      const deletedItems = [
        {
          id_web_navigation_item: Number(target.id_web_navigation_item),
          key: target.web_navigation_item_key,
          sort_order: Number(target.web_navigation_item_sort_order),
          status: Number(target.web_navigation_item_status),
        },
      ];

      const placeholders = deletedIds.map(() => "?").join(", ");

      await connection.query(
        `
          UPDATE web_navigation_item

          SET
            web_navigation_item_status = 0,

            web_navigation_item_deleted_at = NOW(),

            id_updated_by = ?,

            updated = NOW()

          WHERE id_master_comp = ?

            AND id_web_navigation = ?

            AND id_web_navigation_item
              IN (${placeholders})

            AND web_navigation_item_deleted_at
              IS NULL
        `,
        [scope.idAdminAcct, scope.idMasterComp, idNavigation, ...deletedIds],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation_item.deleted",
        category: "data_change",
        module: "web_navigation",
        action: "delete",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation_item",
        entityId: idItem,
        entityLabel: target.web_navigation_item_key,
        before: {
          items: deletedItems,
        },
        after: {
          items: deletedItems.map((item) => ({
            ...item,
            status: 0,
            deleted_at: "set",
          })),
        },
        metadata: {
          navigation_name: navigation.web_navigation_name,

          deleted_item_count: deletedIds.length,

        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_ITEM_DELETED",
        "Navigation item deleted successfully",
        {
          deleted_item_count: deletedIds.length,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("[Web Navigation] Failed to delete navigation item", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_ITEM_DELETE_FAILED",
        "Unable to delete navigation item",
      );
    } finally {
      connection?.release();
    }
  },
);

export default router;
