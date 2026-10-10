-- Normalize product specifications that were imported as a JSON string inside a JSON column.
-- Safe to run repeatedly: only valid double-encoded JSON strings are changed.
UPDATE product_catalog_i18n
SET product_specifications_json = JSON_EXTRACT(
  JSON_UNQUOTE(product_specifications_json),
  '$'
)
WHERE product_specifications_json IS NOT NULL
  AND JSON_TYPE(product_specifications_json) = 'STRING'
  AND JSON_VALID(JSON_UNQUOTE(product_specifications_json)) = 1;
