// Addresses of public content: moved slugs (G-7), and whether a slug is free (G-3).
// Contract: ops/e2e/write/slug-redirect-api.spec.ts.
import { RowDataPacket } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

import { PUBLIC_WHERE } from '../config/public-content.config';

export type SlugEntity = 'article' | 'product' | 'product_category' | 'article_tag';

// The aliases match PUBLIC_WHERE: a/p/c/t for the record, i for its translation.
const ENTITIES: Record<
  SlugEntity,
  { id: string; from: string; alias: string; locale: string; slug: string; i18n: string }
> = {
  article: {
    id: 'id_article',
    from: `article a JOIN article_i18n i
      ON i.id_article = a.id_article AND i.id_master_comp = a.id_master_comp`,
    alias: 'a',
    locale: 'article_locale',
    slug: 'article_slug',
    i18n: 'article_i18n',
  },
  article_tag: {
    id: 'id_article_tag',
    from: `article_tag t JOIN article_tag_i18n i
      ON i.id_article_tag = t.id_article_tag AND i.id_master_comp = t.id_master_comp`,
    alias: 't',
    locale: 'article_tag_locale',
    slug: 'article_tag_slug',
    i18n: 'article_tag_i18n',
  },
  product: {
    id: 'id_product',
    from: `product_catalog p JOIN product_catalog_i18n i
      ON i.id_product = p.id_product AND i.id_master_comp = p.id_master_comp`,
    alias: 'p',
    locale: 'product_locale',
    slug: 'product_slug',
    i18n: 'product_catalog_i18n',
  },
  product_category: {
    id: 'id_product_category',
    from: `product_category c JOIN product_category_i18n i
      ON i.id_product_category = c.id_product_category AND i.id_master_comp = c.id_master_comp`,
    alias: 'c',
    locale: 'product_category_locale',
    slug: 'product_category_slug',
    i18n: 'product_category_i18n',
  },
};

/**
 * Call before saving a record's translations. A slug that changes leaves a redirect behind, and
 * a slug that is taken stops being a redirect (of any record: the live page wins).
 */
export const recordSlugChanges = async (
  connection: PoolConnection,
  entity: SlugEntity,
  id: number | null,
  idMasterComp: number,
  translations: { locale: string; slug: string }[],
) => {
  const config = ENTITIES[entity];
  for (const { locale, slug } of translations) {
    if (id) {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT ${config.slug} AS slug FROM ${config.i18n}
         WHERE ${config.id} = ? AND id_master_comp = ? AND ${config.locale} = ? LIMIT 1`,
        [id, idMasterComp, locale],
      );
      const oldSlug = rows[0]?.slug;
      if (oldSlug && oldSlug !== slug) {
        await connection.query(
          `INSERT INTO slug_redirect (id_master_comp, slug_redirect_entity,
             slug_redirect_entity_id, slug_redirect_locale, slug_redirect_old_slug)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE slug_redirect_entity_id = VALUES(slug_redirect_entity_id)`,
          [idMasterComp, entity, id, locale, oldSlug],
        );
      }
    }
    await connection.query(
      `DELETE FROM slug_redirect WHERE id_master_comp = ? AND slug_redirect_entity = ?
         AND slug_redirect_locale = ? AND slug_redirect_old_slug = ?`,
      [idMasterComp, entity, locale, slug],
    );
  }
};

/** The current slug of the public record that used to have `slug`, or null. */
export const movedSlug = async (
  pool: Pool,
  entity: SlugEntity,
  idMasterComp: number,
  locale: string,
  slug: string,
): Promise<string | null> => {
  const config = ENTITIES[entity];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.${config.slug} AS slug FROM slug_redirect r
     JOIN ${config.from} ON ${config.alias}.${config.id} = r.slug_redirect_entity_id
     WHERE r.id_master_comp = ? AND r.slug_redirect_entity = ? AND r.slug_redirect_locale = ?
       AND r.slug_redirect_old_slug = ? AND ${PUBLIC_WHERE[entity]}
     LIMIT 1`,
    [idMasterComp, entity, locale, slug, idMasterComp, locale],
  );
  return rows[0]?.slug ?? null;
};

/** The body of a public 404: says where the page went when it moved. */
export const notFoundData = (moved: string | null) => (moved ? { moved_to: moved } : undefined);

/** Whether another record (a deleted one too: it keeps its slugs) already has this slug. */
export const isSlugTaken = async (
  pool: Pool,
  entity: SlugEntity,
  id: number | null,
  idMasterComp: number,
  locale: string,
  slug: string,
) => {
  const config = ENTITIES[entity];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${config.id} FROM ${config.i18n}
     WHERE id_master_comp = ? AND ${config.locale} = ? AND ${config.slug} = ?
       AND (? IS NULL OR ${config.id} <> ?)
     LIMIT 1`,
    [idMasterComp, locale, slug, id, id],
  );
  return rows.length > 0;
};
