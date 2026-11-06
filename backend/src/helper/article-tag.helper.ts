// Article tags: one tag has a name and address per language. Tags are picked or written on the
// article form, so saving an article can make new ones. Contract: article-tag-api.spec.ts.
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

import keyhsid from '../hsid';
import { HttpError } from './http-error.helper';
import { decodeId } from './id.helper';
import { contentSlug } from './input.helper';
import { candidateKey } from './auto-key.helper';

export const TAG_NAME_MAX = 100;
const TAGS_PER_ARTICLE = 20;
const TAG_KEY_BASE_MAX = 90;

export type ArticleTagInput = { id: number } | { name: string };

const invalidTags = () =>
  new HttpError(400, 'ARTICLE_TAGS_INVALID', 'Tags must be existing tags or names');

/** The `tags` of an article body; null when it was left out (the article keeps its tags). */
export const readArticleTags = (value: unknown): ArticleTagInput[] | null => {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > TAGS_PER_ARTICLE) throw invalidTags();
  return value.map((item): ArticleTagInput => {
    if (item?.id) {
      const id = decodeId(item.id, keyhsid.idArticleTag);
      if (!id) throw invalidTags();
      return { id };
    }
    const name = String(item?.name ?? '').trim();
    if (!name || name.length > TAG_NAME_MAX || !contentSlug(name)) throw invalidTags();
    return { name };
  });
};

const freeSlug = async (
  connection: PoolConnection,
  idMasterComp: number,
  locale: string,
  base: string,
) => {
  for (let attempt = 1; ; attempt += 1) {
    const slug = candidateKey(base, attempt);
    const [taken] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM article_tag_i18n
       WHERE id_master_comp = ? AND article_tag_locale = ? AND article_tag_slug = ? LIMIT 1`,
      [idMasterComp, locale, slug],
    );
    if (!taken.length) return slug;
  }
};

/** A written name: the live or deleted tag with that Indonesian name, or a new tag. */
const tagIdForName = async (connection: PoolConnection, idMasterComp: number, name: string) => {
  const [found] = await connection.query<RowDataPacket[]>(
    `SELECT t.id_article_tag FROM article_tag t
     JOIN article_tag_i18n i ON i.id_article_tag = t.id_article_tag
       AND i.article_tag_locale = 'id-ID'
     WHERE t.id_master_comp = ? AND i.article_tag_name = ? LIMIT 1`,
    [idMasterComp, name],
  );
  if (found.length) {
    await connection.query(
      `UPDATE article_tag SET article_tag_deleted_at = NULL, article_tag_status = 1
       WHERE id_article_tag = ?`,
      [found[0].id_article_tag],
    );
    return Number(found[0].id_article_tag);
  }
  const base = contentSlug(name).slice(0, TAG_KEY_BASE_MAX);
  let key = '';
  for (let attempt = 1; !key; attempt += 1) {
    const candidate = candidateKey(base, attempt);
    const [taken] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM article_tag WHERE id_master_comp = ? AND article_tag_key = ? LIMIT 1`,
      [idMasterComp, candidate],
    );
    if (!taken.length) key = candidate;
  }
  const [insert] = await connection.query<ResultSetHeader>(
    `INSERT INTO article_tag (id_master_comp, article_tag_key) VALUES (?, ?)`,
    [idMasterComp, key],
  );
  // The English name starts as the same word; it can be translated under Kelola tag.
  for (const locale of ['id-ID', 'en-US']) {
    await connection.query(
      `INSERT INTO article_tag_i18n (id_article_tag, id_master_comp, article_tag_locale,
         article_tag_name, article_tag_slug)
       VALUES (?, ?, ?, ?, ?)`,
      [
        insert.insertId,
        idMasterComp,
        locale,
        name,
        await freeSlug(connection, idMasterComp, locale, base),
      ],
    );
  }
  return insert.insertId;
};

/** Replaces an article's tags; `tags` null leaves them. */
export const saveArticleTags = async (
  connection: PoolConnection,
  idArticle: number,
  idMasterComp: number,
  tags: ArticleTagInput[] | null,
) => {
  if (!tags) return;
  const ids = new Set<number>();
  for (const tag of tags) {
    if ('id' in tag) {
      const [valid] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM article_tag WHERE id_article_tag = ? AND id_master_comp = ?
           AND article_tag_deleted_at IS NULL LIMIT 1`,
        [tag.id, idMasterComp],
      );
      if (!valid.length) throw invalidTags();
      ids.add(tag.id);
    } else {
      ids.add(await tagIdForName(connection, idMasterComp, tag.name));
    }
  }
  await connection.query(`DELETE FROM article_tag_map WHERE id_article = ?`, [idArticle]);
  for (const id of ids) {
    await connection.query(
      `INSERT INTO article_tag_map (id_article, id_article_tag, id_master_comp) VALUES (?, ?, ?)`,
      [idArticle, id, idMasterComp],
    );
  }
};

/** The article's tags with their Indonesian names, for the form. */
export const tagsOfArticle = async (pool: Pool, idArticle: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id_article_tag, i.article_tag_name
     FROM article_tag_map m
     JOIN article_tag t ON t.id_article_tag = m.id_article_tag
       AND t.article_tag_deleted_at IS NULL
     JOIN article_tag_i18n i ON i.id_article_tag = t.id_article_tag
       AND i.article_tag_locale = 'id-ID'
     WHERE m.id_article = ?
     ORDER BY i.article_tag_name`,
    [idArticle],
  );
  return rows.map((row) => ({
    id: keyhsid.idArticleTag.encode(Number(row.id_article_tag)),
    name: row.article_tag_name,
  }));
};
