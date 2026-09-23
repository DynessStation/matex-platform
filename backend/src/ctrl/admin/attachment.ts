import express = require("express");

import { NextFunction, Response } from "express";

import multer from "multer";

import db = require("../../db");

import keyhsid from "../../hsid";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

import {
  AttachmentCollection,
  getAttachmentCollectionConfig,
} from "../../config/attachment.config";

import {
  StoredAttachment,
  buildAttachmentUrl,
  deleteStoredAttachment,
  storeImageAttachment,
} from "../../helper/attachment.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

//==================================================
//==== APP
//==================================================

const app = express();

const { pool } = db;

//==================================================
//==== DECODE ATTACHMENT ID
//==================================================

const decodeAttachmentId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idAttachment.decode(encodedId)[0];

  const idAttachment = Number(decoded);

  if (!decoded || !Number.isInteger(idAttachment) || idAttachment <= 0) {
    return null;
  }

  return idAttachment;
};

//==================================================
//==== ATTACHMENT REFERENCES
//==================================================

interface AttachmentReference {
  idAttachment: number;

  source: string;

  total: number;
}

const getAttachmentReferences = async (
  ids: number[],

  executor: any = pool,
): Promise<AttachmentReference[]> => {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(",");

  const references: AttachmentReference[] = [];

  //==================================================
  //==== ADMIN PROFILE PHOTO
  //==================================================

  const [adminRows] = await executor.query(
    `
          SELECT
            id_profile_photo AS id_attachment,
            COUNT(*) AS total

          FROM admin_acct

          WHERE id_profile_photo IN (
            ${placeholders}
          )

          GROUP BY
            id_profile_photo
        `,
    ids,
  );

  for (const row of adminRows as any[]) {
    references.push({
      idAttachment: Number(row.id_attachment),

      source: "admin_account.profile_photo",

      total: Number(row.total),
    });
  }

  //==================================================
  //==== OFFICE ATTACHMENT
  //==================================================

  const [officeRows] = await executor.query(
    `
      SELECT
        id_attachment,

        COUNT(*) AS total

      FROM office_attachment

      WHERE id_attachment IN (
        ${placeholders}
      )

      GROUP BY
        id_attachment
    `,
    ids,
  );

  for (const row of officeRows as any[]) {
    references.push({
      idAttachment: Number(row.id_attachment),

      source: "office.attachment",

      total: Number(row.total),
    });
  }

  //==================================================
  //==== CMS PAGE ATTACHMENT
  //==================================================

  const [cmsPageRows] = await executor.query(
    `
    SELECT
      id_attachment,

      COUNT(*) AS total

    FROM cms_page_attachment

    WHERE id_attachment IN (
      ${placeholders}
    )

    GROUP BY
      id_attachment
  `,
    ids,
  );

  for (const row of cmsPageRows as any[]) {
    references.push({
      idAttachment: Number(row.id_attachment),

      source: "cms_page.attachment",

      total: Number(row.total),
    });
  }

  const [articleRows] = await executor.query(
    `SELECT id_attachment, COUNT(*) AS total FROM article_attachment
     WHERE id_attachment IN (${placeholders}) GROUP BY id_attachment`,
    ids,
  );
  for (const row of articleRows as any[]) {
    references.push({ idAttachment: Number(row.id_attachment), source: "article.attachment", total: Number(row.total) });
  }

  //==================================================
  //==== FUTURE REFERENCES
  //==================================================
  //
  // Product thumbnail
  // Product gallery
  // Category image
  // Company logo
  // Office logo
  // Article media handled above.
  //
  // Tambahkan checker di sini saat modulnya dibuat.

  return references;
};

//==================================================
//==== MULTER
//==================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    //==================================================
    //==== HARD GLOBAL LIMIT
    //==================================================

    fileSize: 20 * 1024 * 1024,

    files: 10,
  },
});

//==================================================
//==== UPLOAD MIDDLEWARE
//==================================================

const uploadAttachmentFiles = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  upload.array("files", 10)(req, res, (error: any) => {
    if (!error) {
      next();

      return;
    }

    //==================================================
    //==== MULTER ERROR
    //==================================================

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        sendError(
          res,
          400,
          "ATTACHMENT_SERVER_FILE_SIZE_LIMIT",
          "Uploaded file exceeds the server file size limit",
        );

        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        sendError(
          res,
          400,
          "ATTACHMENT_UPLOAD_LIMIT_EXCEEDED",
          "Too many files were uploaded",
        );

        return;
      }

      sendError(
        res,
        400,
        "ATTACHMENT_UPLOAD_PROCESS_FAILED",
        error.message || "Unable to process uploaded files",
      );

      return;
    }

    //==================================================
    //==== UNKNOWN UPLOAD ERROR
    //==================================================

    sendError(
      res,
      400,
      "ATTACHMENT_UPLOAD_PROCESS_FAILED",
      "Unable to process uploaded files",
    );
  });
};

//==================================================
//==== ATTACHMENT - GET LIST
//==================================================

app.get(
  "/api/v1/attachment",

  verifyToken,

  requirePermission("attachment.view"),

  async (req: AuthRequest, res: Response) => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== QUERY PARAMS
      //==================================================

      const parsedPage = Number(req.query.page);

      const parsedLimit = Number(req.query.limit);

      const page =
        Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 50)
          : 20;

      const offset = (page - 1) * limit;

      const search =
        typeof req.query.search === "string" ? req.query.search.trim() : "";

      const collection =
        typeof req.query.collection === "string"
          ? req.query.collection.trim()
          : "";

      const mimeType =
        typeof req.query.mime_type === "string"
          ? req.query.mime_type.trim()
          : "";

      const searchValue = `%${search}%`;

      //==================================================
      //==== GET SESSION SCOPE
      //==================================================

      const [accountRows] = await pool.query(
        `
            SELECT
              id_master_comp,
              id_office,
              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const accounts = accountRows as any[];

      if (accounts.length === 0) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const account = accounts[0];

      if (account.admin_acct_status !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      //==================================================
      //==== WHERE
      //==================================================

      const where: string[] = [
        "a.attachment_status = 1",
        "a.deleted_at IS NULL",
        "a.id_master_comp = ?",
      ];

      const params: any[] = [account.id_master_comp];

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (Number(account.is_all_access) !== 1) {
        where.push("a.id_office = ?");

        params.push(account.id_office);
      }

      //==================================================
      //==== SEARCH
      //==================================================

      if (search) {
        where.push(`
          (
            a.name LIKE ?
            OR a.original_name LIKE ?
            OR a.file_name LIKE ?
          )
        `);

        params.push(searchValue, searchValue, searchValue);
      }

      //==================================================
      //==== COLLECTION FILTER
      //==================================================

      if (collection) {
        where.push("a.collection_name = ?");

        params.push(collection);
      }

      //==================================================
      //==== MIME FILTER
      //==================================================

      if (mimeType) {
        where.push("a.mime_type LIKE ?");

        params.push(`${mimeType}%`);
      }

      const whereQuery = where.join(" AND ");

      //==================================================
      //==== SORT
      //==================================================

      const sort =
        typeof req.query.sort === "string"
          ? req.query.sort.trim().toLowerCase()
          : "";

      let orderQuery = "a.id_attachment DESC";

      switch (sort) {
        case "oldest":
          orderQuery = "a.id_attachment ASC";
          break;

        case "smallest":
          orderQuery = "a.file_size ASC, a.id_attachment DESC";
          break;

        case "largest":
          orderQuery = "a.file_size DESC, a.id_attachment DESC";
          break;

        case "newest":
        default:
          orderQuery = "a.id_attachment DESC";
          break;
      }

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM attachment a

            WHERE ${whereQuery}
          `,
        params,
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== GET DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              a.id_attachment,
              a.collection_name,
              a.name,
              a.original_name,
              a.file_name,
              a.mime_type,
              a.extension,
              a.disk,
              a.storage_path,
              a.file_size,
              a.width,
              a.height,
              a.created,
              a.updated

            FROM attachment a

            WHERE ${whereQuery}

            ORDER BY
              ${orderQuery}

            LIMIT ?
            OFFSET ?
          `,
        [...params, limit, offset],
      );

      //==================================================
      //==== RESPONSE DATA
      //==================================================

      const data = (rows as any[]).map((item) => ({
        id_attachment: keyhsid.idAttachment.encode(item.id_attachment),

        collection_name: item.collection_name,

        name: item.name,

        original_name: item.original_name,

        file_name: item.file_name,

        mime_type: item.mime_type,

        extension: item.extension,

        disk: item.disk,

        storage_path: item.storage_path,

        file_size: Number(item.file_size),

        width: item.width,

        height: item.height,

        asset_url: buildAttachmentUrl(item.storage_path),

        created: item.created,

        updated: item.updated,
      }));

      //==================================================
      //==== PAGINATION
      //==================================================

      const totalPages = Math.ceil(total / limit);

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,
          limit,
          total,

          length: data.length,

          total_pages: totalPages,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Get attachment error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ATTACHMENT - CREATE
//==================================================

app.post(
  "/api/v1/attachment",

  verifyToken,

  requirePermission("attachment.create"),

  uploadAttachmentFiles,

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    //==================================================
    //==== STORED FILE TRACKER
    //==================================================

    const storedFiles: StoredAttachment[] = [];

    const createdAttachments: any[] = [];

    let connection: any = null;

    try {
      //==================================================
      //==== SESSION
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== COLLECTION
      //==================================================

      const collection = String(req.body?.collection ?? "").trim();

      const collectionConfig = getAttachmentCollectionConfig(collection);

      if (!collectionConfig) {
        return sendError(
          res,
          400,
          "ATTACHMENT_COLLECTION_INVALID",
          "Invalid attachment collection",
        );
      }

      //==================================================
      //==== FILES
      //==================================================

      const files = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      if (files.length === 0) {
        return sendError(
          res,
          400,
          "ATTACHMENT_FILE_REQUIRED",
          "At least one file is required",
        );
      }

      //==================================================
      //==== COLLECTION FILE LIMIT
      //==================================================

      if (files.length > collectionConfig.maxFiles) {
        return sendError(
          res,
          400,
          "ATTACHMENT_COLLECTION_FILE_LIMIT_EXCEEDED",
          `A maximum of ${collectionConfig.maxFiles} file(s) is allowed for this collection`,
          {
            max_files: collectionConfig.maxFiles,
          },
        );
      }

      //==================================================
      //==== GET SESSION ACCOUNT SCOPE
      //==================================================

      const [accountRows] = await pool.query(
        `
            SELECT
              id_admin_acct,
              id_master_comp,
              id_office,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const accounts = accountRows as any[];

      if (accounts.length === 0) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const account = accounts[0];

      if (account.admin_acct_status !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      //==================================================
      //==== DATABASE TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const resultData: any[] = [];

      //==================================================
      //==== PROCESS FILES
      //==================================================

      for (const file of files) {
        //==================================================
        //==== STORE PHYSICAL FILE
        //==================================================

        const stored = await storeImageAttachment(
          file,

          collection as AttachmentCollection,
        );

        storedFiles.push(stored);

        //==================================================
        //==== INSERT ATTACHMENT
        //==================================================

        const [insertResult] = await connection.query(
          `
              INSERT INTO attachment (
                collection_name,
                name,
                original_name,
                file_name,
                mime_type,
                extension,
                disk,
                storage_path,
                file_size,
                width,
                height,
                id_master_comp,
                id_office,
                created_by_id,
                created,
                updated,
                attachment_status
              )
              VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                NOW(),
                NOW(),
                1
              )
            `,
          [
            stored.collection_name,

            stored.name,

            stored.original_name,

            stored.file_name,

            stored.mime_type,

            stored.extension,

            stored.disk,

            stored.storage_path,

            stored.file_size,

            stored.width,

            stored.height,

            account.id_master_comp,

            account.id_office,

            idAdminAcct,
          ],
        );

        const idAttachment = Number((insertResult as any).insertId);

        //==================================================
        //==== AUDIT SNAPSHOT
        //==================================================

        createdAttachments.push({
          id_attachment: idAttachment,

          collection_name: stored.collection_name,

          name: stored.name,

          original_name: stored.original_name,

          file_name: stored.file_name,

          mime_type: stored.mime_type,

          extension: stored.extension,

          disk: stored.disk,

          storage_path: stored.storage_path,

          file_size: stored.file_size,

          width: stored.width,

          height: stored.height,

          id_master_comp: Number(account.id_master_comp),

          id_office: Number(account.id_office),

          created_by_id: Number(idAdminAcct),

          attachment_status: 1,
        });

        //==================================================
        //==== RESPONSE ITEM
        //==================================================

        resultData.push({
          id_attachment: keyhsid.idAttachment.encode(idAttachment),

          collection_name: stored.collection_name,

          name: stored.name,

          original_name: stored.original_name,

          file_name: stored.file_name,

          mime_type: stored.mime_type,

          extension: stored.extension,

          disk: stored.disk,

          storage_path: stored.storage_path,

          file_size: stored.file_size,

          width: stored.width,

          height: stored.height,

          asset_url: stored.asset_url,
        });
      }

      //==================================================
      //==== AUDIT
      //==================================================

      for (const attachment of createdAttachments) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: Number(account.id_master_comp),

          eventCode: "attachment.uploaded",

          category: "file",

          module: "attachment",

          action: "upload",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "attachment",

          entityId: attachment.id_attachment,

          entityLabel: attachment.original_name,

          after: attachment,

          metadata: {
            collection: attachment.collection_name,

            upload_batch_size: createdAttachments.length,
          },

          httpStatus: 201,
        });
      }

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        201,
        resultData.length > 1 ? "ATTACHMENTS_UPLOADED" : "ATTACHMENT_UPLOADED",
        resultData.length > 1
          ? "Attachments uploaded successfully"
          : "Attachment uploaded successfully",
        resultData,
      );
    } catch (error: any) {
      //==================================================
      //==== ROLLBACK DATABASE
      //==================================================

      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Attachment rollback error:", rollbackError);
        }
      }

      //==================================================
      //==== REMOVE STORED FILES
      //==================================================

      await Promise.allSettled(
        storedFiles.map((item) => deleteStoredAttachment(item.storage_path)),
      );

      console.error("Create attachment error:", error);

      //==================================================
      //==== KNOWN VALIDATION ERRORS
      //==================================================

      const validationErrorMap: Record<
        string,
        {
          code: string;

          message: string;
        }
      > = {
        "Invalid attachment collection": {
          code: "ATTACHMENT_COLLECTION_INVALID",

          message: "Invalid attachment collection",
        },

        "Attachment collection does not support image processing": {
          code: "ATTACHMENT_IMAGE_PROCESSING_UNSUPPORTED",

          message: "Attachment collection does not support image processing",
        },

        "Unsupported image type": {
          code: "ATTACHMENT_FILE_TYPE_NOT_ALLOWED",

          message: "Unsupported image type",
        },

        "File size exceeds the allowed limit": {
          code: "ATTACHMENT_FILE_TOO_LARGE",

          message: "File size exceeds the allowed limit",
        },
      };

      const validationError = validationErrorMap[String(error?.message ?? "")];

      if (validationError) {
        return sendError(
          res,
          400,
          validationError.code,
          validationError.message,
        );
      }

      //==================================================
      //==== INVALID IMAGE CONTENT
      //==================================================

      if (
        error?.name === "Error" &&
        String(error?.message ?? "")
          .toLowerCase()
          .includes("image")
      ) {
        return sendError(
          res,
          400,
          "ATTACHMENT_IMAGE_PROCESS_FAILED",
          "The uploaded image could not be processed",
        );
      }

      //==================================================
      //==== SERVER ERROR
      //==================================================

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    } finally {
      //==================================================
      //==== RELEASE CONNECTION
      //==================================================

      if (connection) {
        connection.release();
      }
    }
  },
);

//==================================================
//==== ATTACHMENT - DELETE
//==================================================

app.delete(
  "/api/v1/attachment/:id",

  verifyToken,

  requirePermission("attachment.delete"),

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    let connection: any = null;

    try {
      //==================================================
      //==== SESSION
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== DECODE
      //==================================================

      const idAttachment = decodeAttachmentId(req.params.id);

      if (!idAttachment) {
        return sendError(
          res,
          400,
          "ATTACHMENT_INVALID_ID",
          "Invalid attachment identifier",
        );
      }

      //==================================================
      //==== SESSION SCOPE
      //==================================================

      const [accountRows] = await pool.query(
        `
            SELECT
              id_master_comp,
              id_office,
              admin_acct_status,
              is_all_access

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const accounts = accountRows as any[];

      if (!accounts.length) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const account = accounts[0];

      if (account.admin_acct_status !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== GET ATTACHMENT
      //==================================================

      const attachmentWhere: string[] = [
        "id_attachment = ?",
        "id_master_comp = ?",
        "attachment_status = 1",
        "deleted_at IS NULL",
      ];

      const attachmentParams: any[] = [idAttachment, account.id_master_comp];

      if (Number(account.is_all_access) !== 1) {
        attachmentWhere.push("id_office = ?");

        attachmentParams.push(account.id_office);
      }

      const [attachmentRows] = await connection.query(
        `
            SELECT
              id_attachment,

              collection_name,

              name,

              original_name,

              file_name,

              mime_type,

              extension,

              disk,

              storage_path,

              file_size,

              width,

              height,

              id_master_comp,

              id_office,

              created_by_id,

              attachment_status

            FROM attachment

            WHERE
              ${attachmentWhere.join(" AND ")}

            LIMIT 1

            FOR UPDATE
          `,
        attachmentParams,
      );

      const attachments = attachmentRows as any[];

      if (!attachments.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ATTACHMENT_NOT_FOUND",
          "Attachment not found",
        );
      }

      const attachment = attachments[0];

      //==================================================
      //==== REFERENCE CHECK
      //==================================================

      const references = await getAttachmentReferences(
        [idAttachment],

        connection,
      );

      if (references.length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ATTACHMENT_IN_USE",
          "Attachment is currently in use",
        );
      }

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await connection.query(
        `
          UPDATE attachment

          SET
            attachment_status = 99,
            deleted_at = NOW(),
            updated = NOW()

          WHERE id_attachment = ?
            AND attachment_status = 1
            AND deleted_at IS NULL
        `,
        [idAttachment],
      );

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        collection_name: attachment.collection_name,

        name: attachment.name,

        original_name: attachment.original_name,

        file_name: attachment.file_name,

        mime_type: attachment.mime_type,

        extension: attachment.extension,

        disk: attachment.disk,

        storage_path: attachment.storage_path,

        file_size: Number(attachment.file_size),

        width: attachment.width === null ? null : Number(attachment.width),

        height: attachment.height === null ? null : Number(attachment.height),

        id_master_comp: Number(attachment.id_master_comp),

        id_office: Number(attachment.id_office),

        created_by_id: Number(attachment.created_by_id),

        attachment_status: Number(attachment.attachment_status),
      };

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: Number(account.id_master_comp),

        eventCode: "attachment.deleted",

        category: "file",

        module: "attachment",

        action: "delete",

        actorType: "admin",

        actorId: idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "attachment",

        entityId: idAttachment,

        entityLabel: attachment.original_name,

        before: auditBefore,

        after: {
          ...auditBefore,

          attachment_status: 99,
        },

        metadata: {
          delete_type: "soft_delete",

          physical_cleanup_requested: attachment.disk === "local",
        },

        httpStatus: 200,
      });

      await connection.commit();

      //==================================================
      //==== DELETE PHYSICAL FILE
      //==================================================

      if (attachment.disk === "local") {
        try {
          await deleteStoredAttachment(attachment.storage_path);
        } catch (fileError) {
          //==================================================
          //==== DB IS ALREADY DELETED
          //==== PHYSICAL CLEANUP CAN BE RETRIED LATER
          //==================================================

          console.error("Delete attachment physical file error:", fileError);
        }
      }

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        200,
        "ATTACHMENT_DELETED",
        "Attachment deleted successfully",
        {
          id_attachment: keyhsid.idAttachment.encode(idAttachment),
        },
      );
    } catch (error) {
      //==================================================
      //==== ROLLBACK
      //==================================================

      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Delete attachment error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

//==================================================
//==== ATTACHMENT - BULK DELETE
//==================================================

app.post(
  "/api/v1/attachment/bulk-delete",

  verifyToken,

  requirePermission("attachment.delete"),

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    let connection: any = null;

    try {
      //==================================================
      //==== SESSION
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== IDS
      //==================================================

      const encodedIds = Array.isArray(req.body?.ids) ? req.body.ids : [];

      if (!encodedIds.length) {
        return sendError(
          res,
          400,
          "ATTACHMENT_BULK_REQUIRED",
          "At least one attachment is required",
        );
      }

      if (encodedIds.length > 100) {
        return sendError(
          res,
          400,
          "ATTACHMENT_BULK_LIMIT_EXCEEDED",
          "A maximum of 100 attachments can be deleted at once",
          {
            max_items: 100,
          },
        );
      }

      const decodedIds = encodedIds.map((value: unknown) =>
        decodeAttachmentId(value),
      );

      if (decodedIds.some((value: any) => !value)) {
        return sendError(
          res,
          400,
          "ATTACHMENT_BULK_INVALID_ID",
          "One or more attachment identifiers are invalid",
        );
      }

      const ids = Array.from(new Set(decodedIds as number[]));

      //==================================================
      //==== SESSION SCOPE
      //==================================================

      const [accountRows] = await pool.query(
        `
            SELECT
              id_master_comp,
              id_office,
              admin_acct_status,
              is_all_access

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const accounts = accountRows as any[];

      if (!accounts.length) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const account = accounts[0];

      if (account.admin_acct_status !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== GET ATTACHMENTS
      //==================================================

      const placeholders = ids.map(() => "?").join(",");

      //==================================================
      //==== ATTACHMENT SCOPE
      //==================================================

      const attachmentWhere: string[] = [
        `
      id_attachment IN (
        ${placeholders}
      )
    `,
        "id_master_comp = ?",
        "attachment_status = 1",
        "deleted_at IS NULL",
      ];

      const attachmentParams: any[] = [...ids, account.id_master_comp];

      if (Number(account.is_all_access) !== 1) {
        attachmentWhere.push("id_office = ?");

        attachmentParams.push(account.id_office);
      }

      const [attachmentRows] = await connection.query(
        `
          SELECT
            id_attachment,

            collection_name,

            name,

            original_name,

            file_name,

            mime_type,

            extension,

            disk,

            storage_path,

            file_size,

            width,

            height,

            id_master_comp,

            id_office,

            created_by_id,

            attachment_status

          FROM attachment

          WHERE
            ${attachmentWhere.join(" AND ")}

          FOR UPDATE
        `,
        attachmentParams,
      );

      const attachments = attachmentRows as any[];

      //==================================================
      //==== ALL MUST EXIST IN CURRENT SCOPE
      //==================================================

      if (attachments.length !== ids.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ATTACHMENT_BULK_NOT_FOUND",
          "One or more attachments were not found",
        );
      }

      //==================================================
      //==== REFERENCE CHECK
      //==================================================

      const references = await getAttachmentReferences(
        ids,

        connection,
      );

      if (references.length) {
        await connection.rollback();

        const blockedIds = Array.from(
          new Set(references.map((item) => item.idAttachment)),
        ).map((id) => keyhsid.idAttachment.encode(id));

        return sendError(
          res,
          409,
          "ATTACHMENT_BULK_IN_USE",
          "One or more attachments are currently in use",
          {
            blocked_ids: blockedIds,
          },
        );
      }

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await connection.query(
        `
          UPDATE attachment

          SET
            attachment_status = 99,
            deleted_at = NOW(),
            updated = NOW()

          WHERE id_attachment IN (
            ${placeholders}
          )
        `,
        ids,
      );

      //==================================================
      //==== AUDIT
      //==================================================

      for (const attachment of attachments) {
        const auditBefore = {
          collection_name: attachment.collection_name,

          name: attachment.name,

          original_name: attachment.original_name,

          file_name: attachment.file_name,

          mime_type: attachment.mime_type,

          extension: attachment.extension,

          disk: attachment.disk,

          storage_path: attachment.storage_path,

          file_size: Number(attachment.file_size),

          width: attachment.width === null ? null : Number(attachment.width),

          height: attachment.height === null ? null : Number(attachment.height),

          id_master_comp: Number(attachment.id_master_comp),

          id_office: Number(attachment.id_office),

          created_by_id: Number(attachment.created_by_id),

          attachment_status: Number(attachment.attachment_status),
        };

        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: Number(account.id_master_comp),

          eventCode: "attachment.deleted",

          category: "file",

          module: "attachment",

          action: "delete",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "attachment",

          entityId: Number(attachment.id_attachment),

          entityLabel: attachment.original_name,

          before: auditBefore,

          after: {
            ...auditBefore,

            attachment_status: 99,
          },

          metadata: {
            delete_type: "soft_delete",

            bulk_delete: true,

            bulk_size: attachments.length,

            physical_cleanup_requested: attachment.disk === "local",
          },

          httpStatus: 200,
        });
      }

      await connection.commit();

      //==================================================
      //==== DELETE PHYSICAL FILES
      //==================================================

      const physicalDeleteResults = await Promise.allSettled(
        attachments
          .filter((item) => item.disk === "local")
          .map((item) => deleteStoredAttachment(item.storage_path)),
      );

      physicalDeleteResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Bulk delete physical file error:", result.reason);
        }
      });

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        200,
        "ATTACHMENTS_DELETED",
        "Attachments deleted successfully",
        {
          deleted: ids.length,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Bulk delete attachment error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

export default app;
