// Reorder all menu items of a navigation at once.
import express = require("express");
import { Response } from "express";
import db = require("../../../db");
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { writeAuditLog } from "../../../helper/audit-log.helper";
import { decodeWebNavigationItemId } from "../../../helper/web-navigation.helper";

import { getSessionScope, decodeNavigationId } from "./scope";

const { pool } = db;

const router = express.Router();

//==================================================
//==== WEB NAVIGATION ITEM - BULK REORDER
//==================================================

router.put(
  "/api/v1/web-navigation/:id/reorder-items",

  verifyToken,

  requirePermission("web_navigation.update"),

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

      if (!Array.isArray(req.body?.items)) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_REORDER_ITEMS_REQUIRED",
          "Navigation items are required",
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

      const [currentRows] = await connection.query(
        `
            SELECT
              id_web_navigation_item,
              web_navigation_item_key,

              web_navigation_item_sort_order

            FROM web_navigation_item

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_deleted_at
                IS NULL

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const currentItems = currentRows as any[];

      if (req.body.items.length !== currentItems.length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "WEB_NAVIGATION_REORDER_INCOMPLETE",
          "Reorder payload must contain every active navigation item",
        );
      }

      const currentIds = new Set<number>(
        currentItems.map((item) => Number(item.id_web_navigation_item)),
      );

      const normalizedItems: {
        idItem: number;
        sortOrder: number;
      }[] = [];

      const suppliedIds = new Set<number>();

      for (const rawItem of req.body.items) {
        const normalizedId = decodeWebNavigationItemId(
          rawItem?.id_web_navigation_item,
        );

        if (!normalizedId || !currentIds.has(normalizedId)) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "WEB_NAVIGATION_REORDER_ITEM_INVALID",
            "Reorder payload contains an invalid navigation item",
          );
        }

        if (suppliedIds.has(normalizedId)) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "WEB_NAVIGATION_REORDER_ITEM_DUPLICATE",
            "Reorder payload contains a duplicate navigation item",
          );
        }

        suppliedIds.add(normalizedId);

        const sortOrder = Number(rawItem?.sort_order);

        if (
          !Number.isInteger(sortOrder) ||
          sortOrder < 0 ||
          sortOrder > 2147483647
        ) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "WEB_NAVIGATION_REORDER_SORT_INVALID",
            "Reorder payload contains an invalid sort order",
          );
        }

        normalizedItems.push({
          idItem: normalizedId,
          sortOrder,
        });
      }

      for (const currentId of currentIds) {
        if (!suppliedIds.has(currentId)) {
          await connection.rollback();

          return sendError(
            res,
            409,
            "WEB_NAVIGATION_REORDER_INCOMPLETE",
            "Reorder payload must contain every active navigation item",
          );
        }
      }

      const sortOrders = new Set<number>();

      for (const item of normalizedItems) {
        if (sortOrders.has(item.sortOrder)) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "WEB_NAVIGATION_REORDER_SORT_DUPLICATE",
            "Navigation items cannot share the same sort order",
          );
        }

        sortOrders.add(item.sortOrder);
      }

      const before = currentItems
        .map((item) => ({
          id_web_navigation_item: Number(item.id_web_navigation_item),

          key: item.web_navigation_item_key,
          sort_order: Number(item.web_navigation_item_sort_order),
        }))
        .sort((a, b) => a.id_web_navigation_item - b.id_web_navigation_item);

      for (const item of normalizedItems) {
        await connection.query(
          `
            UPDATE web_navigation_item

            SET
              web_navigation_item_sort_order = ?,

              id_updated_by = ?,

              updated = NOW()

            WHERE id_web_navigation_item = ?

              AND id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_item_deleted_at
                IS NULL
          `,
          [
            item.sortOrder,
            scope.idAdminAcct,
            item.idItem,
            idNavigation,
            scope.idMasterComp,
          ],
        );
      }

      const keyById = new Map<number, string>(
        currentItems.map((item) => [
          Number(item.id_web_navigation_item),

          String(item.web_navigation_item_key),
        ]),
      );

      const after = normalizedItems
        .map((item) => ({
          id_web_navigation_item: item.idItem,

          key: keyById.get(item.idItem) ?? null,
          sort_order: item.sortOrder,
        }))
        .sort((a, b) => a.id_web_navigation_item - b.id_web_navigation_item);

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation_items.reordered",
        category: "data_change",
        module: "web_navigation",
        action: "reorder",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          items: before,
        },
        after: {
          items: after,
        },
        metadata: {
          item_count: normalizedItems.length,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_ITEMS_REORDERED",
        "Navigation items reordered successfully",
        {
          item_count: normalizedItems.length,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error(
        "[Web Navigation] Failed to reorder navigation items",
        error,
      );

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_REORDER_FAILED",
        "Unable to reorder navigation items",
      );
    } finally {
      connection?.release();
    }
  },
);

export default router;
