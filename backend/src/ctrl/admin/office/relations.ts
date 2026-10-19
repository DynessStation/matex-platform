// Office photos and operating hours: validation against the database, reads, writes, and audit views.
import { Pool, PoolConnection } from 'mysql2/promise';

import keyhsid from '../../../hsid';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { nullableString, toFlag } from '../../../helper/input.helper';

import { NormalizedOfficeOperatingHour } from './input';

type Executor = Pick<Pool | PoolConnection, 'query'>;

export interface NormalizedOfficeAttachment {
  idAttachment: number;
  attachmentRole: 'cover' | 'gallery';
  caption: string | null;
  sortOrder: number;
  isPublic: 0 | 1;
}

const invalid = (code: string, message: string) => new HttpError(400, code, message);

/** Validates the requested office photos: at most 20, one cover, office_media files of the company. */
export const resolveOfficeAttachments = async (
  executor: Executor,
  idMasterComp: number,
  value: unknown,
): Promise<NormalizedOfficeAttachment[]> => {
  if (!Array.isArray(value)) {
    throw invalid('OFFICE_ATTACHMENTS_ARRAY_INVALID', 'Office attachments must be an array');
  }
  if (value.length > 20) {
    throw invalid(
      'OFFICE_ATTACHMENTS_LIMIT_EXCEEDED',
      'A maximum of 20 office attachments is allowed',
    );
  }
  if (value.length === 0) return [];

  const normalized: NormalizedOfficeAttachment[] = [];
  const ids = new Set<number>();
  let coverCount = 0;

  for (const item of value) {
    const idAttachment = decodeId(item?.id_attachment, keyhsid.idAttachment);
    if (!idAttachment) {
      throw invalid('OFFICE_ATTACHMENT_ID_INVALID', 'Invalid office attachment identifier');
    }
    if (ids.has(idAttachment)) {
      throw invalid('OFFICE_ATTACHMENT_DUPLICATED', 'Duplicate office attachment');
    }
    ids.add(idAttachment);

    const role = String(item?.attachment_role ?? 'gallery')
      .trim()
      .toLowerCase();
    if (role !== 'cover' && role !== 'gallery') {
      throw invalid('OFFICE_ATTACHMENT_ROLE_INVALID', 'Invalid office attachment role');
    }
    if (role === 'cover') coverCount++;

    const caption = nullableString(item?.caption);
    if (caption && caption.length > 255) {
      throw invalid('OFFICE_ATTACHMENT_CAPTION_TOO_LONG', 'Office attachment caption is too long');
    }

    const sortOrder = Number(item?.sort_order ?? 0);
    normalized.push({
      idAttachment,
      attachmentRole: role,
      caption,
      sortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
      isPublic: toFlag(item?.is_public, 1),
    });
  }

  if (coverCount > 1) {
    throw invalid('OFFICE_ATTACHMENT_MULTIPLE_COVER', 'Only one cover image is allowed per office');
  }

  const [rows] = await executor.query(
    `SELECT id_attachment
     FROM attachment
     WHERE id_attachment IN (${[...ids].map(() => '?').join(',')})
       AND id_master_comp = ?
       AND collection_name = 'office_media'
       AND attachment_status = 1
       AND deleted_at IS NULL`,
    [...ids, idMasterComp],
  );
  if ((rows as unknown[]).length !== ids.size) {
    throw invalid(
      'OFFICE_ATTACHMENT_NOT_AVAILABLE',
      'One or more office attachments are not available',
    );
  }

  return normalized;
};

/** Operating hours of an office, ordered by day and sequence. */
export const readOfficeHours = async (executor: Executor, idOffice: number) => {
  const [rows] = await executor.query(
    `SELECT day_of_week, sequence, open_time, close_time, is_closed
     FROM office_operating_hour
     WHERE id_office = ?
     ORDER BY day_of_week ASC, sequence ASC`,
    [idOffice],
  );
  return rows as any[];
};

/** Photo links of an office, cover first. */
export const readOfficeAttachmentLinks = async (executor: Executor, idOffice: number) => {
  const [rows] = await executor.query(
    `SELECT id_attachment, attachment_role, caption, sort_order, is_public
     FROM office_attachment
     WHERE id_office = ?
     ORDER BY CASE WHEN attachment_role = 'cover' THEN 0 ELSE 1 END ASC,
       sort_order ASC, id_attachment ASC`,
    [idOffice],
  );
  return rows as any[];
};

export const insertOperatingHours = async (
  connection: Executor,
  idOffice: number,
  hours: NormalizedOfficeOperatingHour[],
): Promise<void> => {
  if (!hours.length) return;

  await connection.query(
    `INSERT INTO office_operating_hour
       (id_office, day_of_week, sequence, open_time, close_time, is_closed, created, updated)
     VALUES ${hours.map(() => '(?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',')}`,
    hours.flatMap((item) => [
      idOffice,
      item.day_of_week,
      item.sequence,
      item.open_time,
      item.close_time,
      item.is_closed,
    ]),
  );
};

export const insertOfficeAttachments = async (
  connection: Executor,
  idOffice: number,
  attachments: NormalizedOfficeAttachment[],
): Promise<void> => {
  if (!attachments.length) return;

  await connection.query(
    `INSERT INTO office_attachment
       (id_office, id_attachment, attachment_role, caption, sort_order, is_public, created, updated)
     VALUES ${attachments.map(() => '(?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',')}`,
    attachments.flatMap((item) => [
      idOffice,
      item.idAttachment,
      item.attachmentRole,
      item.caption,
      item.sortOrder,
      item.isPublic,
    ]),
  );
};

export const toAuditOperatingHours = (items: any[]) =>
  items
    .map((item) => ({
      day_of_week: Number(item.day_of_week),
      sequence: Number(item.sequence),
      open_time: item.open_time ? String(item.open_time).slice(0, 8) : null,
      close_time: item.close_time ? String(item.close_time).slice(0, 8) : null,
      is_closed: Number(item.is_closed),
    }))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence);

/** Accepts normalized input (camelCase) or database rows (snake_case). */
export const toAuditOfficeAttachments = (items: any[]) =>
  items
    .map((item) => ({
      id_attachment: Number(item.idAttachment ?? item.id_attachment),
      attachment_role: String(item.attachmentRole ?? item.attachment_role),
      caption: item.caption ?? null,
      sort_order: Number(item.sortOrder ?? item.sort_order ?? 0),
      is_public: Number(item.isPublic ?? item.is_public ?? 0),
    }))
    .sort((a, b) => {
      if (a.attachment_role !== b.attachment_role) {
        if (a.attachment_role === 'cover') return -1;
        if (b.attachment_role === 'cover') return 1;
      }
      return a.sort_order - b.sort_order || a.id_attachment - b.id_attachment;
    });

export const isSameAuditValue = (before: unknown, after: unknown): boolean =>
  JSON.stringify(before) === JSON.stringify(after);

export const getOfficeAttachmentDiff = (before: any[], after: any[]) => {
  const beforeIds = new Set(before.map((item) => Number(item.id_attachment)));
  const afterIds = new Set(after.map((item) => Number(item.id_attachment)));
  return {
    added: after
      .filter((item) => !beforeIds.has(Number(item.id_attachment)))
      .map((item) => Number(item.id_attachment)),
    removed: before
      .filter((item) => !afterIds.has(Number(item.id_attachment)))
      .map((item) => Number(item.id_attachment)),
  };
};
