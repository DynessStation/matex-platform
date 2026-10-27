// Office list and detail.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList } from '../../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { decodeId } from '../../../helper/id.helper';
import { countOf, pageMeta, parseListQuery, sortColumn } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  id: 'o.id_office',
  office_code: 'o.office_code',
  office_name: 'o.office_name',
  city: 'o.city',
  admin_count: 'admin_count',
  media_count: 'media_count',
  created: 'o.created',
  updated: 'o.updated',
  public_sort_order: 'o.public_sort_order',
};

const SEARCH = `(COALESCE(o.office_code, '') LIKE ? OR o.office_name LIKE ?
  OR COALESCE(o.address, '') LIKE ? OR COALESCE(o.city, '') LIKE ?
  OR COALESCE(o.province, '') LIKE ?)`;

const optionalNumber = (value: unknown) => (value === null ? null : Number(value));

router.get(
  '/api/v1/office',
  verifyToken,
  requirePermission('office.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const {
      page,
      limit,
      offset,
      searchValue,
      sort,
      direction: requested,
    } = parseListQuery(req.query);
    const orderBy = sortColumn(SORTABLE, sort, 'o.id_office');
    const direction = requested ?? 'ASC';
    const searchParams = Array(5).fill(searchValue);

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM office o
       WHERE o.id_master_comp = ? AND o.status IN (0, 1) AND ${SEARCH}`,
      [scope.idMasterComp, ...searchParams],
    );
    const total = Number((totalRows as RowDataPacket[])[0]?.total ?? 0);
    // Rows before search and filters, for "x of y" in the admin table.
    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM office WHERE id_master_comp = ? AND status IN (0, 1)`,
      [scope.idMasterComp],
    );

    const [rows] = await pool.query(
      `SELECT o.id_office, o.office_code, o.office_name, o.office_description, o.address, o.city,
         o.province, o.postal_code, o.email, o.phone, o.lat, o.lng, o.attendance_enabled,
         o.attendance_radius_meter, o.website_url, o.is_public, o.public_slug, o.public_sort_order,
         o.google_place_id, o.google_maps_url, o.google_business_url, o.created, o.updated, o.status,
         COUNT(DISTINCT aa.id_admin_acct) AS admin_count,
         COUNT(DISTINCT oa.id_office_attachment) AS media_count
       FROM office o
       LEFT JOIN admin_acct aa ON o.id_office = aa.id_office AND aa.admin_acct_status IN (0, 1)
       LEFT JOIN office_attachment oa ON o.id_office = oa.id_office
       WHERE o.id_master_comp = ? AND o.status IN (0, 1) AND ${SEARCH}
       GROUP BY o.id_office, o.office_code, o.office_name, o.office_description, o.address,
         o.city, o.province, o.postal_code, o.email, o.phone, o.lat, o.lng, o.attendance_enabled,
         o.attendance_radius_meter, o.website_url, o.is_public, o.public_slug, o.public_sort_order,
         o.google_place_id, o.google_maps_url, o.google_business_url, o.created, o.updated, o.status
       ORDER BY ${orderBy} ${direction}
       LIMIT ? OFFSET ?`,
      [scope.idMasterComp, ...searchParams, limit, offset],
    );

    const data = (rows as RowDataPacket[]).map((item) => ({
      id_office: keyhsid.idOffice.encode(item.id_office),
      office_code: item.office_code,
      office_name: item.office_name,
      office_description: item.office_description,
      address: item.address,
      city: item.city,
      province: item.province,
      postal_code: item.postal_code,
      email: item.email,
      phone: item.phone,
      lat: optionalNumber(item.lat),
      lng: optionalNumber(item.lng),
      attendance_enabled: Number(item.attendance_enabled),
      attendance_radius_meter: optionalNumber(item.attendance_radius_meter),
      website_url: item.website_url,
      is_public: Number(item.is_public),
      public_slug: item.public_slug,
      public_sort_order: Number(item.public_sort_order ?? 0),
      google_place_id: item.google_place_id,
      google_maps_url: item.google_maps_url,
      google_business_url: item.google_business_url,
      admin_count: Number(item.admin_count ?? 0),
      media_count: Number(item.media_count ?? 0),
      status: Number(item.status),
      status_label: Number(item.status) === 1 ? 'Active' : 'Inactive',
      visibility_label: Number(item.is_public) === 1 ? 'Public' : 'Internal',
      created: item.created,
      updated: item.updated,
    }));

    return sendList(
      res,
      'OFFICES_LISTED',
      'Offices loaded',
      data,
      pageMeta({ page, limit }, total, totalAll),
    );
  },
);

router.get(
  '/api/v1/office/:id',
  verifyToken,
  requirePermission('office.view'),
  async (req: AuthRequest, res: Response) => {
    const idOffice = decodeId(req.params.id, keyhsid.idOffice);
    if (!idOffice) return sendError(res, 400, 'OFFICE_INVALID_ID', 'Invalid office identifier');

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [officeRows] = await pool.query(
      `SELECT o.*,
         (SELECT COUNT(*) FROM admin_acct aa
          WHERE aa.id_office = o.id_office AND aa.admin_acct_status IN (0, 1)) AS admin_count
       FROM office o
       WHERE o.id_office = ? AND o.id_master_comp = ? AND o.status IN (0, 1)
       LIMIT 1`,
      [idOffice, scope.idMasterComp],
    );
    const office = (officeRows as RowDataPacket[])[0];
    if (!office) return sendError(res, 404, 'OFFICE_NOT_FOUND', 'Office not found');

    // Place in the public order ("Posisi 2 dari 3"), shown read-only in the form.
    const [placeRows] = await pool.query(
      `SELECT COUNT(*) AS total,
         SUM(public_sort_order < ? OR (public_sort_order = ? AND id_office <= ?)) AS position
       FROM office WHERE id_master_comp = ? AND is_public = 1 AND status IN (0, 1)`,
      [office.public_sort_order, office.public_sort_order, idOffice, scope.idMasterComp],
    );
    const place = (placeRows as RowDataPacket[])[0];

    const [hourRows] = await pool.query(
      `SELECT id_office_operating_hour, day_of_week, sequence, open_time, close_time, is_closed
       FROM office_operating_hour
       WHERE id_office = ?
       ORDER BY day_of_week ASC, sequence ASC`,
      [idOffice],
    );

    const [attachmentRows] = await pool.query(
      `SELECT oa.id_office_attachment, oa.attachment_role, oa.caption, oa.sort_order, oa.is_public,
         a.id_attachment, a.collection_name, a.name, a.original_name, a.file_name, a.mime_type,
         a.extension, a.disk, a.storage_path, a.file_size, a.width, a.height
       FROM office_attachment oa
       INNER JOIN attachment a ON oa.id_attachment = a.id_attachment
         AND a.attachment_status = 1 AND a.deleted_at IS NULL
       WHERE oa.id_office = ?
       ORDER BY CASE WHEN oa.attachment_role = 'cover' THEN 0 ELSE 1 END ASC,
         oa.sort_order ASC, oa.id_office_attachment ASC`,
      [idOffice],
    );

    return res.status(200).json({
      success: true,
      data: {
        id_office: keyhsid.idOffice.encode(office.id_office),
        office_code: office.office_code,
        office_name: office.office_name,
        office_description: office.office_description,
        address: office.address,
        city: office.city,
        province: office.province,
        postal_code: office.postal_code,
        email: office.email,
        phone: office.phone,
        lat: optionalNumber(office.lat),
        lng: optionalNumber(office.lng),
        attendance_enabled: Number(office.attendance_enabled),
        attendance_radius_meter: optionalNumber(office.attendance_radius_meter),
        website_url: office.website_url,
        is_public: Number(office.is_public),
        public_slug: office.public_slug,
        public_sort_order: Number(office.public_sort_order ?? 0),
        public_position: Number(office.is_public) === 1 ? Number(place?.position ?? 0) : null,
        public_total: Number(place?.total ?? 0),
        google_place_id: office.google_place_id,
        google_maps_url: office.google_maps_url,
        google_business_url: office.google_business_url,
        status: Number(office.status),
        status_label: Number(office.status) === 1 ? 'Active' : 'Inactive',
        admin_count: Number(office.admin_count ?? 0),
        operating_hours: (hourRows as RowDataPacket[]).map((item) => ({
          id_office_operating_hour: item.id_office_operating_hour,
          day_of_week: Number(item.day_of_week),
          sequence: Number(item.sequence),
          open_time: item.open_time,
          close_time: item.close_time,
          is_closed: Number(item.is_closed),
        })),
        attachments: (attachmentRows as RowDataPacket[]).map((item) => ({
          id_office_attachment: item.id_office_attachment,
          attachment_role: item.attachment_role,
          caption: item.caption,
          sort_order: Number(item.sort_order ?? 0),
          is_public: Number(item.is_public),
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
        })),
        created: office.created,
        updated: office.updated,
      },
    });
  },
);

export default router;
