-- Keep the public header predictable: six root items, localized labels and
-- stable routes. Legacy columns remain in place during the additive migration.

UPDATE `web_navigation`
SET
  `web_navigation_name` = 'Header Website',
  `web_navigation_location` = 'header',
  `web_navigation_default_locale` = 'id-ID',
  `web_navigation_status` = CASE
    WHEN `web_navigation_deleted_at` IS NOT NULL THEN 1
    ELSE `web_navigation_status`
  END,
  `web_navigation_deleted_at` = NULL
WHERE `web_navigation_key` = 'primary';

INSERT INTO `web_navigation`
(
  `id_master_comp`,
  `web_navigation_key`,
  `web_navigation_name`,
  `web_navigation_location`,
  `web_navigation_default_locale`,
  `web_navigation_status`
)
SELECT
  company.`id_master_comp`,
  'primary',
  'Header Website',
  'header',
  'id-ID',
  1
FROM `master_comp` company
WHERE NOT EXISTS (
  SELECT 1
  FROM `web_navigation` navigation
  WHERE navigation.`id_master_comp` = company.`id_master_comp`
    AND navigation.`web_navigation_key` = 'primary'
);

UPDATE `web_navigation_item` item
INNER JOIN `web_navigation` navigation
  ON navigation.`id_web_navigation` = item.`id_web_navigation`
  AND navigation.`id_master_comp` = item.`id_master_comp`
INNER JOIN (
  SELECT 'home' AS `item_key`, 0 AS `sort_order`
  UNION ALL SELECT 'about', 1
  UNION ALL SELECT 'categories', 2
  UNION ALL SELECT 'products', 3
  UNION ALL SELECT 'articles', 4
  UNION ALL SELECT 'contact', 5
) fixed_item
  ON fixed_item.`item_key` = item.`web_navigation_item_key`
SET
  item.`web_navigation_item_sort_order` = CASE
    WHEN item.`web_navigation_item_deleted_at` IS NOT NULL
      THEN fixed_item.`sort_order`
    ELSE item.`web_navigation_item_sort_order`
  END,
  item.`id_parent_web_navigation_item` = NULL,
  item.`id_cms_page` = NULL,
  item.`web_navigation_item_link_type` = 'internal',
  item.`web_navigation_item_target_blank` = 0,
  item.`web_navigation_item_icon` = NULL,
  item.`web_navigation_item_badge_text` = NULL,
  item.`web_navigation_item_badge_color` = NULL,
  item.`web_navigation_item_status` = CASE
    WHEN item.`web_navigation_item_deleted_at` IS NOT NULL THEN 1
    ELSE item.`web_navigation_item_status`
  END,
  item.`web_navigation_item_deleted_at` = NULL
WHERE navigation.`web_navigation_key` = 'primary';

INSERT INTO `web_navigation_item`
(
  `id_web_navigation`,
  `id_master_comp`,
  `id_parent_web_navigation_item`,
  `id_cms_page`,
  `web_navigation_item_key`,
  `web_navigation_item_link_type`,
  `web_navigation_item_target_blank`,
  `web_navigation_item_icon`,
  `web_navigation_item_badge_text`,
  `web_navigation_item_badge_color`,
  `web_navigation_item_sort_order`,
  `web_navigation_item_status`
)
SELECT
  navigation.`id_web_navigation`,
  navigation.`id_master_comp`,
  NULL,
  NULL,
  fixed_item.`item_key`,
  'internal',
  0,
  NULL,
  NULL,
  NULL,
  fixed_item.`sort_order`,
  1
FROM `web_navigation` navigation
CROSS JOIN (
  SELECT 'home' AS `item_key`, 0 AS `sort_order`
  UNION ALL SELECT 'about', 1
  UNION ALL SELECT 'categories', 2
  UNION ALL SELECT 'products', 3
  UNION ALL SELECT 'articles', 4
  UNION ALL SELECT 'contact', 5
) fixed_item
WHERE navigation.`web_navigation_key` = 'primary'
  AND navigation.`web_navigation_deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `web_navigation_item` existing
    WHERE existing.`id_web_navigation` = navigation.`id_web_navigation`
      AND existing.`web_navigation_item_key` = fixed_item.`item_key`
  );

INSERT INTO `web_navigation_item_i18n`
(
  `id_web_navigation_item`,
  `id_master_comp`,
  `web_navigation_item_locale`,
  `web_navigation_item_label`,
  `web_navigation_item_path`,
  `web_navigation_item_url`,
  `web_navigation_item_i18n_status`
)
SELECT
  item.`id_web_navigation_item`,
  item.`id_master_comp`,
  fixed_translation.`locale`,
  fixed_translation.`label`,
  fixed_translation.`path`,
  NULL,
  1
FROM `web_navigation_item` item
INNER JOIN `web_navigation` navigation
  ON navigation.`id_web_navigation` = item.`id_web_navigation`
  AND navigation.`id_master_comp` = item.`id_master_comp`
INNER JOIN (
  SELECT 'home' AS `item_key`, 'id-ID' AS `locale`, 'Beranda' AS `label`, '/' AS `path`
  UNION ALL SELECT 'home', 'en-US', 'Home', '/en'
  UNION ALL SELECT 'about', 'id-ID', 'Tentang MATEX', '/tentang-matex'
  UNION ALL SELECT 'about', 'en-US', 'About MATEX', '/en/about-matex'
  UNION ALL SELECT 'categories', 'id-ID', 'Kategori', '/katalog'
  UNION ALL SELECT 'categories', 'en-US', 'Category', '/en/catalog'
  UNION ALL SELECT 'products', 'id-ID', 'Produk', '/katalog'
  UNION ALL SELECT 'products', 'en-US', 'Product', '/en/catalog'
  UNION ALL SELECT 'articles', 'id-ID', 'Artikel', '/artikel'
  UNION ALL SELECT 'articles', 'en-US', 'Blog', '/en/articles'
  UNION ALL SELECT 'contact', 'id-ID', 'Hubungi', '/kontak'
  UNION ALL SELECT 'contact', 'en-US', 'Contact', '/en/contact-us'
) fixed_translation
  ON fixed_translation.`item_key` = item.`web_navigation_item_key`
WHERE navigation.`web_navigation_key` = 'primary'
  AND item.`web_navigation_item_deleted_at` IS NULL
ON DUPLICATE KEY UPDATE
  `web_navigation_item_path` = VALUES(`web_navigation_item_path`),
  `web_navigation_item_url` = NULL,
  `web_navigation_item_i18n_status` = 1;
