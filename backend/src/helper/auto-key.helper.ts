// Internal keys are made by the server: from the Indonesian slug when a record is created, kept
// as they are after that. A key sent by a client is still taken as given (and refused when it
// already exists). Contract: ops/e2e/write/slug-redirect-api.spec.ts.
import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

const KEY_MAX = 120;

const AUTO_KEY_TABLES = {
  article: { table: 'article', id: 'id_article', key: 'article_key' },
  product: { table: 'product_catalog', id: 'id_product', key: 'product_key' },
  product_category: {
    table: 'product_category',
    id: 'id_product_category',
    key: 'product_category_key',
  },
} as const;

/** `base`, or `base-2`, `base-3`... when taken, always within the key length. */
export const candidateKey = (base: string, attempt: number): string => {
  if (attempt < 2) return base.slice(0, KEY_MAX);
  const suffix = `-${attempt}`;
  return `${base.slice(0, KEY_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
};

/** The key to save. Deleted records count: the unique index covers them. */
export const resolveAutoKey = async (
  connection: PoolConnection,
  entity: keyof typeof AUTO_KEY_TABLES,
  id: number | null,
  idMasterComp: number,
  sent: string,
  translations: { locale: string; slug: string }[],
): Promise<string> => {
  if (sent) return sent;
  const config = AUTO_KEY_TABLES[entity];
  if (id) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ${config.key} AS item_key FROM ${config.table}
       WHERE ${config.id} = ? AND id_master_comp = ? LIMIT 1`,
      [id, idMasterComp],
    );
    if (rows[0]) return String(rows[0].item_key);
  }
  const base = (translations.find((item) => item.locale === 'id-ID') ?? translations[0]).slug;
  for (let attempt = 1; ; attempt += 1) {
    const candidate = candidateKey(base, attempt);
    const [taken] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM ${config.table} WHERE id_master_comp = ? AND ${config.key} = ? LIMIT 1`,
      [idMasterComp, candidate],
    );
    if (!taken.length) return candidate;
  }
};
