-- Provide a neutral public Careers placeholder for companies that do not yet
-- have authored careers content. Existing authored or published content is
-- preserved; the legacy cms_page tables remain untouched.

INSERT INTO `website_page`
(
  `id_master_comp`,
  `website_page_key`,
  `website_page_default_locale`,
  `website_page_is_published`
)
SELECT
  company.`id_master_comp`,
  'career',
  'id-ID',
  1
FROM `master_comp` company
WHERE NOT EXISTS (
  SELECT 1
  FROM `website_page` existing
  WHERE existing.`id_master_comp` = company.`id_master_comp`
    AND existing.`website_page_key` = 'career'
);


-- A completely empty migrated draft is the placeholder created during the
-- additive CMS migration. Publish only that case; authored drafts stay drafts.
UPDATE `website_page` page
SET page.`website_page_is_published` = 1
WHERE page.`website_page_key` = 'career'
  AND page.`website_page_is_published` = 0
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_i18n` translation
    WHERE translation.`id_website_page` = page.`id_website_page`
      AND (
        translation.`website_page_translation_is_published` = 1
        OR (
          translation.`website_page_locale` = 'id-ID'
          AND translation.`website_page_path` <> 'karir'
        )
        OR (
          translation.`website_page_locale` = 'en-US'
          AND translation.`website_page_path` <> 'careers'
        )
        OR (
          translation.`website_page_locale` = 'id-ID'
          AND translation.`website_page_title` <> 'Karir'
        )
        OR (
          translation.`website_page_locale` = 'en-US'
          AND translation.`website_page_title` <> 'Careers'
        )
        OR NULLIF(TRIM(translation.`website_page_summary`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_body_html`), '') IS NOT NULL
        OR translation.`website_page_content_json` IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_seo_title`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_seo_description`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_seo_keywords`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_canonical_url`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_social_title`), '') IS NOT NULL
        OR NULLIF(TRIM(translation.`website_page_social_description`), '') IS NOT NULL
        OR translation.`website_page_schema_json` IS NOT NULL
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_media` media
    WHERE media.`id_website_page` = page.`id_website_page`
  );


INSERT INTO `website_page_i18n`
(
  `id_website_page`,
  `id_master_comp`,
  `website_page_locale`,
  `website_page_path`,
  `website_page_title`,
  `website_page_summary`,
  `website_page_body_html`,
  `website_page_seo_title`,
  `website_page_seo_description`,
  `website_page_seo_robots`,
  `website_page_social_title`,
  `website_page_social_description`,
  `website_page_translation_is_published`
)
SELECT
  page.`id_website_page`,
  page.`id_master_comp`,
  locale_data.`locale`,
  CASE WHEN locale_data.`locale` = 'id-ID' THEN 'karir' ELSE 'careers' END,
  CASE WHEN locale_data.`locale` = 'id-ID' THEN 'Karir' ELSE 'Careers' END,
  CASE
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'Informasi kesempatan bergabung dengan MATEX akan tersedia di halaman ini.'
    ELSE 'Opportunities to join MATEX will be available on this page.'
  END,
  CASE
    WHEN locale_data.`locale` = 'id-ID'
      THEN '<p>Saat ini belum ada informasi lowongan yang dipublikasikan.</p><p>Silakan kunjungi kembali halaman ini untuk pembaruan kesempatan bergabung dengan MATEX.</p>'
    ELSE '<p>There are currently no published job openings.</p><p>Please check this page again for future opportunities to join MATEX.</p>'
  END,
  CASE WHEN locale_data.`locale` = 'id-ID' THEN 'Karir di MATEX' ELSE 'Careers at MATEX' END,
  CASE
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'Informasi lowongan dan kesempatan bergabung dengan MATEX.'
    ELSE 'Job openings and opportunities to join MATEX.'
  END,
  'index, follow',
  CASE WHEN locale_data.`locale` = 'id-ID' THEN 'Karir di MATEX' ELSE 'Careers at MATEX' END,
  CASE
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'Informasi lowongan dan kesempatan bergabung dengan MATEX.'
    ELSE 'Job openings and opportunities to join MATEX.'
  END,
  page.`website_page_is_published`
FROM `website_page` page
CROSS JOIN (
  SELECT 'id-ID' AS `locale`
  UNION ALL
  SELECT 'en-US' AS `locale`
) locale_data
WHERE page.`website_page_key` = 'career'
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_i18n` existing
    WHERE existing.`id_website_page` = page.`id_website_page`
      AND existing.`website_page_locale` = locale_data.`locale`
  );


-- Fill only empty placeholder translations. User-authored values are retained.
UPDATE `website_page_i18n` translation
INNER JOIN `website_page` page
  ON page.`id_website_page` = translation.`id_website_page`
  AND page.`id_master_comp` = translation.`id_master_comp`
SET
  translation.`website_page_path` = CASE
    WHEN translation.`website_page_locale` = 'id-ID' THEN 'karir'
    ELSE 'careers'
  END,
  translation.`website_page_title` = CASE
    WHEN translation.`website_page_locale` = 'id-ID' THEN 'Karir'
    ELSE 'Careers'
  END,
  translation.`website_page_summary` = CASE
    WHEN translation.`website_page_locale` = 'id-ID'
      THEN 'Informasi kesempatan bergabung dengan MATEX akan tersedia di halaman ini.'
    ELSE 'Opportunities to join MATEX will be available on this page.'
  END,
  translation.`website_page_body_html` = CASE
    WHEN translation.`website_page_locale` = 'id-ID'
      THEN '<p>Saat ini belum ada informasi lowongan yang dipublikasikan.</p><p>Silakan kunjungi kembali halaman ini untuk pembaruan kesempatan bergabung dengan MATEX.</p>'
    ELSE '<p>There are currently no published job openings.</p><p>Please check this page again for future opportunities to join MATEX.</p>'
  END,
  translation.`website_page_seo_title` = CASE
    WHEN translation.`website_page_locale` = 'id-ID' THEN 'Karir di MATEX'
    ELSE 'Careers at MATEX'
  END,
  translation.`website_page_seo_description` = CASE
    WHEN translation.`website_page_locale` = 'id-ID'
      THEN 'Informasi lowongan dan kesempatan bergabung dengan MATEX.'
    ELSE 'Job openings and opportunities to join MATEX.'
  END,
  translation.`website_page_seo_robots` = 'index, follow',
  translation.`website_page_social_title` = CASE
    WHEN translation.`website_page_locale` = 'id-ID' THEN 'Karir di MATEX'
    ELSE 'Careers at MATEX'
  END,
  translation.`website_page_social_description` = CASE
    WHEN translation.`website_page_locale` = 'id-ID'
      THEN 'Informasi lowongan dan kesempatan bergabung dengan MATEX.'
    ELSE 'Job openings and opportunities to join MATEX.'
  END,
  translation.`website_page_translation_is_published` = 1
WHERE page.`website_page_key` = 'career'
  AND page.`website_page_is_published` = 1
  AND translation.`website_page_translation_is_published` = 0
  AND NULLIF(TRIM(translation.`website_page_summary`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_body_html`), '') IS NULL
  AND translation.`website_page_content_json` IS NULL
  AND NULLIF(TRIM(translation.`website_page_seo_title`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_seo_description`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_seo_keywords`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_canonical_url`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_social_title`), '') IS NULL
  AND NULLIF(TRIM(translation.`website_page_social_description`), '') IS NULL
  AND translation.`website_page_schema_json` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_media` media
    WHERE media.`id_website_page` = page.`id_website_page`
  );
