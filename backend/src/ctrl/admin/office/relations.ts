// Office photos and operating hours: availability checks, inserts, and audit formatting.
import keyhsid from '../../../hsid';

import { NormalizedOfficeOperatingHour, nullableString, normalizeFlag } from './input';

export interface OfficeAttachmentInput {
  id_attachment: string;
  attachment_role?: string;
  caption?: string | null;
  sort_order?: number;
  is_public?: number | boolean;
}

export interface NormalizedOfficeAttachment {
  idAttachment: number;
  attachmentRole: 'cover' | 'gallery';
  caption: string | null;
  sortOrder: number;
  isPublic: 0 | 1;
}

export type AttachmentResolveResult =
  | {
      success: true;
      data: NormalizedOfficeAttachment[];
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

// Resolve office attachments

export const resolveOfficeAttachments = async (
  executor: any,
  idMasterComp: number,
  value: unknown,
): Promise<AttachmentResolveResult> => {
  if (!Array.isArray(value)) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_ATTACHMENTS_ARRAY_INVALID',
      message: 'Office attachments must be an array',
    };
  }

  if (value.length > 20) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_ATTACHMENTS_LIMIT_EXCEEDED',
      message: 'A maximum of 20 office attachments is allowed',
    };
  }

  if (value.length === 0) {
    return {
      success: true,
      data: [],
    };
  }

  const normalized: NormalizedOfficeAttachment[] = [];

  const ids = new Set<number>();

  let coverCount = 0;

  for (const raw of value) {
    const item = raw as OfficeAttachmentInput;

    const encodedId = String(item?.id_attachment ?? '').trim();

    const decoded = keyhsid.idAttachment.decode(encodedId)[0];

    const idAttachment = Number(decoded);

    if (!decoded || !Number.isInteger(idAttachment) || idAttachment <= 0) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_ATTACHMENT_ID_INVALID',
        message: 'Invalid office attachment identifier',
      };
    }

    if (ids.has(idAttachment)) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_ATTACHMENT_DUPLICATED',
        message: 'Duplicate office attachment',
      };
    }

    ids.add(idAttachment);

    const roleRaw = String(item?.attachment_role ?? 'gallery')
      .trim()
      .toLowerCase();

    if (roleRaw !== 'cover' && roleRaw !== 'gallery') {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_ATTACHMENT_ROLE_INVALID',
        message: 'Invalid office attachment role',
      };
    }

    const role = roleRaw as 'cover' | 'gallery';

    if (role === 'cover') {
      coverCount++;
    }

    const caption = nullableString(item?.caption);

    if (caption && caption.length > 255) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_ATTACHMENT_CAPTION_TOO_LONG',
        message: 'Office attachment caption is too long',
      };
    }

    const rawSortOrder = Number(item?.sort_order ?? 0);

    const sortOrder = Number.isInteger(rawSortOrder) && rawSortOrder >= 0 ? rawSortOrder : 0;

    normalized.push({
      idAttachment,
      attachmentRole: role,
      caption,
      sortOrder,
      isPublic: normalizeFlag(item?.is_public, 1),
    });
  }

  if (coverCount > 1) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_ATTACHMENT_MULTIPLE_COVER',
      message: 'Only one cover image is allowed per office',
    };
  }

  // Validate attachments

  const numericIds = [...ids];

  const placeholders = numericIds.map(() => '?').join(',');

  const [attachmentRows] = await executor.query(
    `
          SELECT
            id_attachment

          FROM attachment

          WHERE id_attachment IN (
            ${placeholders}
          )

            AND id_master_comp = ?

            AND collection_name =
              'office_media'

            AND attachment_status = 1

            AND deleted_at IS NULL
        `,
    [...numericIds, idMasterComp],
  );

  if ((attachmentRows as any[]).length !== numericIds.length) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_ATTACHMENT_NOT_AVAILABLE',
      message: 'One or more office attachments are not available',
    };
  }

  return {
    success: true,
    data: normalized,
  };
};

// Insert operating hours

export const insertOperatingHours = async (
  connection: any,
  idOffice: number,
  hours: NormalizedOfficeOperatingHour[],
): Promise<void> => {
  if (!hours.length) {
    return;
  }

  const valuesSql = hours.map(() => '(?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',');

  const values = hours.flatMap((item) => [
    idOffice,
    item.day_of_week,
    item.sequence,
    item.open_time,
    item.close_time,
    item.is_closed,
  ]);

  await connection.query(
    `
        INSERT INTO office_operating_hour
        (
          id_office,

          day_of_week,

          sequence,

          open_time,

          close_time,

          is_closed,

          created,

          updated
        )
        VALUES
          ${valuesSql}
      `,
    values,
  );
};

// Insert office attachments

export const insertOfficeAttachments = async (
  connection: any,
  idOffice: number,
  attachments: NormalizedOfficeAttachment[],
): Promise<void> => {
  if (!attachments.length) {
    return;
  }

  const valuesSql = attachments.map(() => '(?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',');

  const values = attachments.flatMap((item) => [
    idOffice,
    item.idAttachment,
    item.attachmentRole,
    item.caption,
    item.sortOrder,
    item.isPublic,
  ]);

  await connection.query(
    `
        INSERT INTO office_attachment
        (
          id_office,

          id_attachment,

          attachment_role,

          caption,

          sort_order,

          is_public,

          created,

          updated
        )
        VALUES
          ${valuesSql}
      `,
    values,
  );
};

// Audit operating hours

export const toAuditOperatingHours = (items: any[]) => {
  return items
    .map((item) => ({
      day_of_week: Number(item.day_of_week),
      sequence: Number(item.sequence),
      open_time: item.open_time ? String(item.open_time).slice(0, 8) : null,
      close_time: item.close_time ? String(item.close_time).slice(0, 8) : null,
      is_closed: Number(item.is_closed),
    }))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence);
};

// Audit office attachments

export const toAuditOfficeAttachments = (items: any[]) => {
  return items
    .map((item) => ({
      id_attachment: Number(item.idAttachment ?? item.id_attachment),
      attachment_role: String(item.attachmentRole ?? item.attachment_role),
      caption: item.caption ?? null,
      sort_order: Number(item.sortOrder ?? item.sort_order ?? 0),
      is_public: Number(item.isPublic ?? item.is_public ?? 0),
    }))
    .sort((a, b) => {
      if (a.attachment_role !== b.attachment_role) {
        if (a.attachment_role === 'cover') {
          return -1;
        }

        if (b.attachment_role === 'cover') {
          return 1;
        }
      }

      return a.sort_order - b.sort_order || a.id_attachment - b.id_attachment;
    });
};

// Audit value equality

export const isSameAuditValue = (before: unknown, after: unknown): boolean => {
  return JSON.stringify(before) === JSON.stringify(after);
};

// Attachment diff

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
