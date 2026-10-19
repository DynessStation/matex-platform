import { PoolConnection } from 'mysql2/promise';

import { AuditRequest } from '../middleware/request-context.middleware';

// Actor

export type AuditActorType = 'admin' | 'client' | 'system' | 'job' | 'integration';

// Category

export type AuditCategory =
  'data_change' | 'security' | 'access_control' | 'file' | 'system' | 'business' | 'integration';

// Outcome

export type AuditOutcome = 'success' | 'failure' | 'denied';

// Source

export type AuditSource = 'admin_web' | 'public_web' | 'api' | 'system' | 'job' | 'integration';

// Write mode

export type AuditWriteMode = 'best_effort' | 'strict';

// Write options

export interface WriteAuditLogOptions {
  req?: AuditRequest;
  /**
   * Dipakai kalau business operation
   * sedang berada dalam DB transaction.
   */
  connection?: PoolConnection;
  /**
   * Default best_effort:
   * business process tidak gagal hanya
   * karena audit insert gagal.
   *
   * strict:
   * error audit dilempar kembali.
   */
  writeMode?: AuditWriteMode;
  idMasterComp?: number | null;
  eventCode: string;
  category: AuditCategory;
  module: string;
  action: string;
  actorType?: AuditActorType;
  actorId?: string | number | null;
  actorLabel?: string | null;
  entityType?: string | null;
  entityId?: string | number | null;
  entityLabel?: string | null;
  source?: AuditSource;
  outcome?: AuditOutcome;
  httpStatus?: number | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  changedFields?: string[] | null;
}

// Write result

export interface WriteAuditLogResult {
  success: boolean;
  idAuditLog?: number;
  requestId: string;
  correlationId: string;
  integrityHash: string | null;
}
