-- Align the fixed About MATEX page with the fields rendered by the public
-- Kartify About template. Legacy rich text and unrelated JSON fields are no
-- longer part of this page contract. Re-running this migration is safe.

START TRANSACTION;

UPDATE `website_page_i18n` translation
INNER JOIN `website_page` page
  ON page.`id_website_page` = translation.`id_website_page`
  AND page.`id_master_comp` = translation.`id_master_comp`
SET
  translation.`website_page_content_json` = JSON_COMPACT(CONCAT(
    '{"about_contract_version":1,"highlights":',
    CASE
      WHEN JSON_VALID(translation.`website_page_content_json`) = 1
        AND JSON_TYPE(JSON_EXTRACT(
          translation.`website_page_content_json`,
          '$.highlights'
        )) = 'ARRAY'
      THEN JSON_EXTRACT(
        translation.`website_page_content_json`,
        '$.highlights'
      )
      WHEN JSON_VALID(translation.`website_page_content_json`) = 1
        AND JSON_TYPE(JSON_EXTRACT(
          translation.`website_page_content_json`,
          '$.features'
        )) = 'ARRAY'
      THEN JSON_EXTRACT(
        translation.`website_page_content_json`,
        '$.features'
      )
      ELSE '[]'
    END,
    '}'
  )),
  translation.`website_page_body_html` = NULL,
  translation.`updated` = NOW()
WHERE page.`website_page_key` = 'about'
  AND (
    JSON_VALID(translation.`website_page_content_json`) = 0
    OR COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(
        translation.`website_page_content_json`,
        '$.about_contract_version'
      )),
      ''
    ) <> '1'
    OR COALESCE(
      JSON_TYPE(JSON_EXTRACT(
        translation.`website_page_content_json`,
        '$.highlights'
      )),
      ''
    ) <> 'ARRAY'
    OR translation.`website_page_body_html` IS NOT NULL
  );

-- The public template uses the media translation as its image alt text.
-- Seed only missing values and leave editor-provided descriptions untouched.
INSERT INTO `website_page_media_i18n` (
  `id_website_page_media`,
  `website_page_media_locale`,
  `website_page_media_caption`,
  `website_page_media_alt_text`,
  `created`,
  `updated`
)
SELECT
  media.`id_website_page_media`,
  translation.`website_page_locale`,
  NULL,
  CASE
    WHEN translation.`website_page_locale` = 'en-US' THEN 'About MATEX'
    ELSE 'Tentang MATEX'
  END,
  NOW(),
  NOW()
FROM `website_page_media` media
INNER JOIN `website_page` page
  ON page.`id_website_page` = media.`id_website_page`
INNER JOIN `website_page_i18n` translation
  ON translation.`id_website_page` = page.`id_website_page`
  AND translation.`id_master_comp` = page.`id_master_comp`
WHERE page.`website_page_key` = 'about'
  AND media.`website_page_media_slot` = 'about_content'
  AND translation.`website_page_locale` IN ('id-ID', 'en-US')
ON DUPLICATE KEY UPDATE
  `updated` = IF(
    NULLIF(TRIM(`website_page_media_alt_text`), '') IS NULL,
    NOW(),
    `updated`
  ),
  `website_page_media_alt_text` = COALESCE(
    NULLIF(TRIM(`website_page_media_alt_text`), ''),
    VALUES(`website_page_media_alt_text`)
  );

COMMIT;
