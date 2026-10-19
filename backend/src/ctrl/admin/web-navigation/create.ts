// Create a navigation.
import express = require("express");
import { Response } from "express";
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { writeAuditLog } from "../../../helper/audit-log.helper";

import { getSessionScope } from "./scope";
import { normalizeNavigationKey, normalizeNavigationMetadata } from "./metadata";

const { pool } = db;

const router = express.Router();

//==================================================
//==== WEB NAVIGATION - CREATE
//==================================================

router.post(
  "/api/v1/web-navigation",

  verifyToken,

  requirePermission("web_navigation.create"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const key = normalizeNavigationKey(req.body?.web_navigation_key);

      if (!key) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_KEY_INVALID",
          "Invalid web navigation key",
        );
      }

      const metadata = normalizeNavigationMetadata(req.body);

      if (!metadata.success) {
        return sendError(res, 400, metadata.code, metadata.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        `
          SELECT id_web_navigation

          FROM web_navigation

          WHERE id_master_comp = ?

            AND web_navigation_key = ?

          LIMIT 1

          FOR UPDATE
        `,
        [scope.idMasterComp, key],
      );

      if ((existingRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "WEB_NAVIGATION_KEY_EXISTS",
          "Web navigation key is already in use",
        );
      }

      const [insertResult] = await connection.query(
        `
          INSERT INTO web_navigation
          (
            id_master_comp,

            web_navigation_key,

            web_navigation_name,

            web_navigation_location,

            web_navigation_default_locale,

            web_navigation_status,

            web_navigation_settings_json,

            id_created_by,

            id_updated_by,

            created,

            updated
          )
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())
        `,
        [
          scope.idMasterComp,
          key,
          metadata.name,
          metadata.location,
          metadata.defaultLocale,
          metadata.settingsJson,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );

      const idNavigation = Number((insertResult as any).insertId);

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation.created",
        category: "data_change",
        module: "web_navigation",
        action: "create",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: metadata.name,
        after: {
          key,
          name: metadata.name,
          location: metadata.location,
          default_locale: metadata.defaultLocale,
          status: 0,
          settings: metadata.settings,
        },
        httpStatus: 201,
      });

      await connection.commit();

      return sendSuccess(
        res,
        201,
        "WEB_NAVIGATION_CREATED",
        "Web navigation created successfully",
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
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
          "WEB_NAVIGATION_KEY_EXISTS",
          "Web navigation key is already in use",
        );
      }

      console.error("[Web Navigation] Failed to create navigation", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_CREATE_FAILED",
        "Unable to create web navigation",
      );
    } finally {
      connection?.release();
    }
  },
);

export default router;
