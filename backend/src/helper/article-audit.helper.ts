// What the article audit looks for: the same conditions count the problems in the insight panel
// (ctrl/admin/article-insight.ts) and filter the list when "Perbaiki" is clicked (?audit=).
// Each is a condition on an article with the alias `a`.
export const ARTICLE_AUDITS = {
  no_tag: `NOT EXISTS (SELECT 1 FROM article_tag_map m
      JOIN article_tag t ON t.id_article_tag = m.id_article_tag
        AND t.article_tag_deleted_at IS NULL
      WHERE m.id_article = a.id_article)`,
  no_image: `NOT EXISTS (SELECT 1 FROM article_attachment aa
      WHERE aa.id_article = a.id_article AND aa.article_attachment_role = 'thumbnail')`,
  no_excerpt: `EXISTS (SELECT 1 FROM article_i18n x
      WHERE x.id_article = a.id_article
        AND (x.article_excerpt IS NULL OR TRIM(x.article_excerpt) = ''))`,
  // Both languages are required to save, so "no English" shows as text copied from Indonesian.
  untranslated: `EXISTS (SELECT 1 FROM article_i18n id_text
      JOIN article_i18n en_text ON en_text.id_article = id_text.id_article
        AND en_text.article_locale = 'en-US'
      WHERE id_text.id_article = a.id_article AND id_text.article_locale = 'id-ID'
        AND (id_text.article_title = en_text.article_title
          OR id_text.article_body = en_text.article_body))`,
  // Longer than a search result shows.
  long_meta: `EXISTS (SELECT 1 FROM article_i18n x
      WHERE x.id_article = a.id_article
        AND (CHAR_LENGTH(x.article_meta_title) > 60
          OR CHAR_LENGTH(x.article_meta_description) > 160))`,
} as const;

export type ArticleAudit = keyof typeof ARTICLE_AUDITS;

export const isArticleAudit = (value: unknown): value is ArticleAudit =>
  typeof value === 'string' && Object.keys(ARTICLE_AUDITS).includes(value);
