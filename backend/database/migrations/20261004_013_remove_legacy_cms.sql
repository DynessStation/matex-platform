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

ALTER TABLE `web_navigation_item`
  DROP FOREIGN KEY IF EXISTS
    `fk_web_navigation_item_cms_page_company`,
  DROP FOREIGN KEY IF EXISTS
    `fk_web_navigation_item_parent`,
  DROP CONSTRAINT IF EXISTS
    `chk_web_navigation_item_link_type`,
  DROP CONSTRAINT IF EXISTS
    `chk_web_navigation_item_target_blank`,
  DROP CONSTRAINT IF EXISTS
    `web_navigation_item_settings_json`,
  DROP INDEX IF EXISTS
    `idx_web_navigation_item_cms_page`,
  DROP INDEX IF EXISTS
    `idx_web_navigation_item_parent`,
  DROP INDEX IF EXISTS
    `idx_web_navigation_item_order`,
  DROP COLUMN IF EXISTS
    `id_parent_web_navigation_item`,
  DROP COLUMN IF EXISTS
    `id_cms_page`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_link_type`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_target_blank`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_icon`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_badge_text`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_badge_color`,
  DROP COLUMN IF EXISTS
    `web_navigation_item_settings_json`;

CREATE INDEX IF NOT EXISTS `idx_web_navigation_item_order`
  ON `web_navigation_item`
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
