//==================================================
//==== AUDIT LOG
//==================================================

export interface IAuditLog {
  /**
   * Compatibility field untuk generic Table Kartify.
   */
  id: any;

  id_audit_log: string;

  /**
   * Null berarti global audit event,
   * contoh: perubahan Admin Permission.
   */
  id_master_comp: string | null;

  request_id: string;
  correlation_id: string;

  event_code: string;

  category: string;
  module: string;
  action: string;

  actor: IAuditLogActor;

  entity: IAuditLogEntity;

  source: string;
  outcome: string;

  http: IAuditLogHttp;

  ip_address: string | null;

  duration_ms: number | null;

  integrity_version: number | null;
  has_integrity: boolean;

  created: string;
}

//==================================================
//==== ACTOR
//==================================================

export interface IAuditLogActor {
  type: string;

  id: string | null;

  label: string | null;
}

//==================================================
//==== ENTITY
//==================================================

export interface IAuditLogEntity {
  type: string | null;

  id: string | null;

  label: string | null;
}

//==================================================
//==== HTTP CONTEXT
//==================================================

export interface IAuditLogHttp {
  method: string | null;

  route: string | null;

  status: number | null;
}

//==================================================
//==== PAGINATION
//==================================================

export interface IAuditLogPagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

//==================================================
//==== LIST MODEL
//==================================================

export interface IAuditLogModel {
  success: boolean;

  data: IAuditLog[];

  pagination: IAuditLogPagination;
}

//==================================================
//==== DETAIL HTTP
//==================================================

export interface IAuditLogDetailHttp {
  method: string | null;

  route: string | null;

  status: number | null;

  ip_address: string | null;

  user_agent: string | null;
}

//==================================================
//==== CHANGES
//==================================================

export interface IAuditLogChanges {
  before: unknown;

  after: unknown;

  changed_fields: unknown;
}

//==================================================
//==== INTEGRITY
//==================================================

export interface IAuditLogIntegrity {
  version: number;

  hash: string | null;

  valid: boolean;
}

//==================================================
//==== DETAIL
//==================================================

export interface IAuditLogDetail {
  id_audit_log: string;

  id_master_comp: string | null;

  request_id: string;

  correlation_id: string;

  event_code: string;

  category: string;

  module: string;

  action: string;

  actor: IAuditLogActor;

  entity: IAuditLogEntity;

  source: string;

  outcome: string;

  http: IAuditLogDetailHttp;

  changes: IAuditLogChanges;

  metadata: unknown;

  duration_ms: number | null;

  integrity: IAuditLogIntegrity;

  created: string;
}

//==================================================
//==== DETAIL RESPONSE
//==================================================

export interface IAuditLogDetailResponse {
  success: boolean;

  data: IAuditLogDetail;
}
