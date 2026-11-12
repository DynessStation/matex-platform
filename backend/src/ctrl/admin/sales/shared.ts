// Shared pieces of Penjualan: the store a request names (visible to this account), the date
// range of a list, and the audit writer.
import { Response } from 'express';
import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

import keyhsid from '../../../hsid';
import { AdminScope, getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { entityWhere, isDate } from '../../../helper/business.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { AuthRequest } from '../../../middleware/auth-jwt.middleware';

type Executor = Pick<Pool, 'query'> | PoolConnection;

export const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

export interface VisibleStore extends RowDataPacket {
  id_store: number;
  id_business_entity: number;
  store_name: string;
  business_entity_name: string;
  sales_channel_name: string;
}

/** The store of ?store= or body.store, when the account may see its entity. */
export const storeOf = async (
  executor: Executor,
  scope: AdminScope,
  value: unknown,
  required: boolean,
): Promise<VisibleStore | null> => {
  if (value === undefined || value === '' || value === null) {
    if (required) throw new HttpError(400, 'SALES_STORE_REQUIRED', 'Choose the store');
    return null;
  }
  const id = decodeId(value, keyhsid.idStore);
  if (!id) throw new HttpError(400, 'STORE_INVALID_ID', 'Invalid store identifier');
  const visible = entityWhere(scope, 's.id_business_entity');
  const [rows] = await executor.query<VisibleStore[]>(
    `SELECT s.id_store, s.id_business_entity, s.store_name, be.business_entity_name,
       sc.sales_channel_name
     FROM store s
     INNER JOIN business_entity be ON be.id_business_entity = s.id_business_entity
     INNER JOIN sales_channel sc ON sc.id_sales_channel = s.id_sales_channel
     WHERE s.id_store = ? AND s.id_master_comp = ? AND s.store_deleted_at IS NULL ${visible.sql}
     LIMIT 1`,
    [id, scope.idMasterComp, ...visible.params],
  );
  if (!rows[0]) throw new HttpError(404, 'STORE_NOT_FOUND', 'Store not found');
  return rows[0];
};

/** SQL that keeps rows to stores the account may see (alias `s` for store). */
export const storeWhere = (scope: AdminScope) => entityWhere(scope, 's.id_business_entity');

/** ?from= and ?to= as dates, or 400. */
export const rangeOf = (
  query: Record<string, unknown>,
): { from: string | null; to: string | null } => {
  const read = (key: string) => {
    const value = query[key];
    if (value === undefined || value === '') return null;
    if (!isDate(value)) throw new HttpError(400, 'SALES_DATE_INVALID', `Check ${key} (YYYY-MM-DD)`);
    return value;
  };
  return { from: read('from'), to: read('to') };
};

export const auditSales = (
  req: AuthRequest,
  connection: PoolConnection,
  scope: AdminScope,
  entry: {
    eventCode: string;
    action: string;
    entityType: string;
    entityId: number;
    entityLabel: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
) =>
  writeAuditLog({
    req,
    connection,
    writeMode: 'strict',
    idMasterComp: scope.idMasterComp,
    category: 'data_change',
    module: 'sales',
    actorType: 'admin',
    actorId: scope.idAdminAcct,
    actorLabel: req.user?.alias ?? null,
    httpStatus: 200,
    ...entry,
  });
