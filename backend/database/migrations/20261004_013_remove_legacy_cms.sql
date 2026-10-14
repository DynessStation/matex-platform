-- The fixed website pages have replaced the generic CMS page model.
-- This migration removes the obsolete navigation fields, legacy permissions,
-- and CMS tables after their supported data has been copied to website_page*.

START TRANSACTION;

DELETE access_permission
FROM `admin_access_permission` access_permission
INNER JOIN `admin_permission` permission
  ON permission.`id_admin_permission` =
    access_permission.`id_admin_permission`
WHERE permission.`permission_key` IN
(
  'cms_page.view',
  'cms_page.create',
  'cms_page.update',
  'cms_page.delete',
  'cms_page.publish'
);

DELETE FROM `admin_permission`
WHERE `permission_key` IN
(
  'cms_page.view',
  'cms_page.create',
  'cms_page.update',
  'cms_page.delete',
  'cms_page.publish'
);

-- MySQL and MariaDB assign different names to an unnamed inline CHECK.
-- Resolve that generated name before removing the legacy JSON column.
SET @settings_check_name =
(
  SELECT `CONSTRAINT_NAME`
  FROM `information_schema`.`TABLE_CONSTRAINTS`
  WHERE `CONSTRAINT_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'web_navigation_item'
    AND `CONSTRAINT_TYPE` = 'CHECK'
    AND `CONSTRAINT_NAME` IN
    (
      'web_navigation_item_chk_1',
      'web_navigation_item_settings_json'
    )
  LIMIT 1
);

SET @drop_settings_check_sql = IF
(
  @settings_check_name IS NULL,
  'SELECT 1',
  CONCAT
  (
    'ALTER TABLE `web_navigation_item` DROP CONSTRAINT `',
    REPLACE(@settings_check_name, '`', '``'),
    '`'
  )
);

PREPARE drop_settings_check_statement FROM @drop_settings_check_sql;
EXECUTE drop_settings_check_statement;
DEALLOCATE PREPARE drop_settings_check_statement;

ALTER TABLE `web_navigation_item`
  DROP FOREIGN KEY `fk_web_navigation_item_cms_page_company`,
  DROP FOREIGN KEY `fk_web_navigation_item_parent`,
  DROP CONSTRAINT `chk_web_navigation_item_link_type`,
  DROP CONSTRAINT `chk_web_navigation_item_target_blank`,
  DROP INDEX `idx_web_navigation_item_cms_page`,
  DROP INDEX `idx_web_navigation_item_parent`,
  DROP INDEX `idx_web_navigation_item_order`,
  DROP COLUMN `id_parent_web_navigation_item`,
  DROP COLUMN `id_cms_page`,
  DROP COLUMN `web_navigation_item_link_type`,
  DROP COLUMN `web_navigation_item_target_blank`,
  DROP COLUMN `web_navigation_item_icon`,
  DROP COLUMN `web_navigation_item_badge_text`,
  DROP COLUMN `web_navigation_item_badge_color`,
  DROP COLUMN `web_navigation_item_settings_json`,
  ADD INDEX `idx_web_navigation_item_order`
  (
    `id_web_navigation`,
    `web_navigation_item_status`,
    `web_navigation_item_sort_order`
  );

DROP TABLE IF EXISTS `cms_page_attachment_i18n`;
DROP TABLE IF EXISTS `cms_page_attachment`;
DROP TABLE IF EXISTS `cms_page_i18n`;
DROP TABLE IF EXISTS `cms_page`;

COMMIT;
