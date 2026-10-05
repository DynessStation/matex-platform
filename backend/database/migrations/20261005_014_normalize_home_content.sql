-- Replace legacy Kartify demo section flags with the sections rendered by the
-- MATEX Home page. Existing tag and newsletter configuration is preserved.
-- Re-running this migration does not overwrite the current contract.

START TRANSACTION;

UPDATE `website_page_i18n` translation
INNER JOIN `website_page` page
  ON page.`id_website_page` = translation.`id_website_page`
  AND page.`id_master_comp` = translation.`id_master_comp`
SET
  -- MariaDB 10.4 can stringify JSON values returned by a column expression
  -- when they are passed back into JSON_OBJECT. Building the document as
  -- valid JSON text keeps tags and newsletter as nested objects.
  translation.`website_page_content_json` = JSON_COMPACT(CONCAT(
    '{',
      '"home_contract_version":2,',
      '"latex_features":{"status":true},',
      '"categories":{"status":true},',
      '"products":{"status":true},',
      '"articles":{"status":true},',
      '"tags":',
      CASE
        WHEN JSON_VALID(translation.`website_page_content_json`) = 1
          AND JSON_TYPE(
            JSON_EXTRACT(translation.`website_page_content_json`, '$.tags')
          ) = 'OBJECT'
        THEN JSON_EXTRACT(translation.`website_page_content_json`, '$.tags')
        WHEN JSON_VALID(
          JSON_UNQUOTE(
            JSON_EXTRACT(translation.`website_page_content_json`, '$.tags')
          )
        ) = 1
          AND JSON_TYPE(JSON_EXTRACT(
            JSON_UNQUOTE(JSON_EXTRACT(
              translation.`website_page_content_json`,
              '$.tags'
            )),
            '$'
          )) = 'OBJECT'
        THEN JSON_EXTRACT(
          JSON_UNQUOTE(JSON_EXTRACT(
            translation.`website_page_content_json`,
            '$.tags'
          )),
          '$'
        )
        ELSE '{"status":false}'
      END,
      ',"newsletter":',
      CASE
        WHEN JSON_VALID(translation.`website_page_content_json`) = 1
          AND JSON_TYPE(JSON_EXTRACT(
            translation.`website_page_content_json`,
            '$.newsletter'
          )) = 'OBJECT'
        THEN JSON_EXTRACT(
          translation.`website_page_content_json`,
          '$.newsletter'
        )
        WHEN JSON_VALID(JSON_UNQUOTE(JSON_EXTRACT(
          translation.`website_page_content_json`,
          '$.newsletter'
        ))) = 1
          AND JSON_TYPE(JSON_EXTRACT(
            JSON_UNQUOTE(JSON_EXTRACT(
              translation.`website_page_content_json`,
              '$.newsletter'
            )),
            '$'
          )) = 'OBJECT'
        THEN JSON_EXTRACT(
          JSON_UNQUOTE(JSON_EXTRACT(
            translation.`website_page_content_json`,
            '$.newsletter'
          )),
          '$'
        )
        ELSE '{"status":false}'
      END,
    '}'
  )),
  translation.`website_page_body_html` = NULL,
  translation.`updated` = NOW()
WHERE page.`website_page_key` = 'home'
  AND (
    JSON_VALID(translation.`website_page_content_json`) = 0
    OR COALESCE(
      JSON_UNQUOTE(
        JSON_EXTRACT(
          translation.`website_page_content_json`,
          '$.home_contract_version'
        )
      ),
      ''
    ) <> '2'
    OR COALESCE(
      JSON_TYPE(JSON_EXTRACT(translation.`website_page_content_json`, '$.tags')),
      ''
    ) <> 'OBJECT'
    OR COALESCE(
      JSON_TYPE(
        JSON_EXTRACT(translation.`website_page_content_json`, '$.newsletter')
      ),
      ''
    ) <> 'OBJECT'
  );

-- Home has no generic rich-text area in the public template.
UPDATE `website_page_i18n` translation
INNER JOIN `website_page` page
  ON page.`id_website_page` = translation.`id_website_page`
  AND page.`id_master_comp` = translation.`id_master_comp`
SET
  translation.`website_page_body_html` = NULL,
  translation.`updated` = NOW()
WHERE page.`website_page_key` = 'home'
  AND translation.`website_page_body_html` IS NOT NULL;

COMMIT;
