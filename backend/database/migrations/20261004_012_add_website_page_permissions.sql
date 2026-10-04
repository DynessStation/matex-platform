-- Give fixed website pages their own permissions while preserving access for
-- every profile that already manages the legacy CMS pages.

START TRANSACTION;

INSERT INTO `admin_permission`
(
  `permission_key`,
  `permission_name`,
  `permission_group`,
  `permission_description`,
  `permission_status`
)
VALUES
(
  'website_page.view',
  'View Website Pages',
  'Website',
  'View fixed website page content, SEO, media, and publication settings',
  1
),
(
  'website_page.update',
  'Update Website Pages',
  'Website',
  'Update fixed website page content, SEO, media, and publication settings',
  1
)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `permission_group` = VALUES(`permission_group`),
  `permission_description` = VALUES(`permission_description`),
  `permission_status` = 1,
  `updated` = current_timestamp();

INSERT INTO `admin_access_permission`
(
  `id_admin_access`,
  `id_admin_permission`
)
SELECT DISTINCT
  existing_access.`id_admin_access`,
  target_permission.`id_admin_permission`
FROM `admin_access_permission` existing_access
INNER JOIN `admin_permission` source_permission
  ON source_permission.`id_admin_permission` =
    existing_access.`id_admin_permission`
  AND source_permission.`permission_key` = 'cms_page.view'
INNER JOIN `admin_permission` target_permission
  ON target_permission.`permission_key` = 'website_page.view'
LEFT JOIN `admin_access_permission` assigned_access
  ON assigned_access.`id_admin_access` = existing_access.`id_admin_access`
  AND assigned_access.`id_admin_permission` =
    target_permission.`id_admin_permission`
WHERE assigned_access.`id_admin_access_permission` IS NULL;

INSERT INTO `admin_access_permission`
(
  `id_admin_access`,
  `id_admin_permission`
)
SELECT DISTINCT
  existing_access.`id_admin_access`,
  target_permission.`id_admin_permission`
FROM `admin_access_permission` existing_access
INNER JOIN `admin_permission` source_permission
  ON source_permission.`id_admin_permission` =
    existing_access.`id_admin_permission`
  AND source_permission.`permission_key` = 'cms_page.update'
INNER JOIN `admin_permission` target_permission
  ON target_permission.`permission_key` = 'website_page.update'
LEFT JOIN `admin_access_permission` assigned_access
  ON assigned_access.`id_admin_access` = existing_access.`id_admin_access`
  AND assigned_access.`id_admin_permission` =
    target_permission.`id_admin_permission`
WHERE assigned_access.`id_admin_access_permission` IS NULL;

COMMIT;
