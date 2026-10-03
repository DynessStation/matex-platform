ALTER TABLE `cms_page_attachment`
  ADD COLUMN `cms_page_attachment_action_type` varchar(20) NOT NULL DEFAULT 'none'
    AFTER `cms_page_attachment_is_public`,
  ADD COLUMN `cms_page_attachment_action_value` varchar(1000) DEFAULT NULL
    AFTER `cms_page_attachment_action_type`,
  ADD CONSTRAINT `chk_cms_page_attachment_action_type`
    CHECK (`cms_page_attachment_action_type` IN ('none','internal','external','product','category'));

UPDATE `cms_page_attachment`
SET
  `cms_page_attachment_action_type` = 'none',
  `cms_page_attachment_action_value` = NULL
WHERE `cms_page_attachment_action_type` IS NULL
   OR `cms_page_attachment_action_type` = '';

UPDATE `cms_page`
SET `cms_page_is_system` = 1
WHERE `cms_page_key` IN ('home', 'about');

INSERT INTO `cms_page`
(
  `id_master_comp`,
  `cms_page_key`,
  `cms_page_type`,
  `cms_page_template`,
  `cms_page_content_mode`,
  `cms_page_default_locale`,
  `cms_page_status`,
  `cms_page_visibility`,
  `cms_page_is_system`,
  `cms_page_sort_order`
)
SELECT
  mc.`id_master_comp`,
  fixed_page.`page_key`,
  'standard',
  fixed_page.`page_template`,
  'html',
  'id-ID',
  0,
  1,
  1,
  fixed_page.`sort_order`
FROM `master_comp` mc
CROSS JOIN (
  SELECT 'terms' AS `page_key`, 'legal' AS `page_template`, 60 AS `sort_order`
  UNION ALL
  SELECT 'career', 'career', 70
) fixed_page
WHERE NOT EXISTS (
  SELECT 1
  FROM `cms_page` existing
  WHERE existing.`id_master_comp` = mc.`id_master_comp`
    AND existing.`cms_page_key` = fixed_page.`page_key`
);

INSERT INTO `cms_page_i18n`
(
  `id_cms_page`,
  `id_master_comp`,
  `cms_page_locale`,
  `cms_page_slug`,
  `cms_page_title`,
  `cms_page_meta_robots`,
  `cms_page_i18n_status`
)
SELECT
  page.`id_cms_page`,
  page.`id_master_comp`,
  locale_data.`locale`,
  locale_data.`slug`,
  locale_data.`title`,
  'noindex,nofollow',
  0
FROM `cms_page` page
INNER JOIN (
  SELECT 'terms' AS `page_key`, 'id-ID' AS `locale`, 'syarat-ketentuan' AS `slug`, 'Syarat & Ketentuan' AS `title`
  UNION ALL
  SELECT 'terms', 'en-US', 'terms-and-conditions', 'Terms & Conditions'
  UNION ALL
  SELECT 'career', 'id-ID', 'karir', 'Karir'
  UNION ALL
  SELECT 'career', 'en-US', 'careers', 'Careers'
) locale_data ON locale_data.`page_key` = page.`cms_page_key`
WHERE NOT EXISTS (
  SELECT 1
  FROM `cms_page_i18n` existing
  WHERE existing.`id_cms_page` = page.`id_cms_page`
    AND existing.`cms_page_locale` = locale_data.`locale`
);
