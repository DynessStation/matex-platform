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
  'cms_page.view',
  'View CMS Pages',
  'CMS Page',
  'View CMS pages and page details',
  1
),
(
  'cms_page.create',
  'Create CMS Page',
  'CMS Page',
  'Create new CMS pages',
  1
),
(
  'cms_page.update',
  'Update CMS Page',
  'CMS Page',
  'Update CMS page content and settings',
  1
),
(
  'cms_page.delete',
  'Delete CMS Page',
  'CMS Page',
  'Delete or remove CMS pages',
  1
),
(
  'cms_page.publish',
  'Publish CMS Page',
  'CMS Page',
  'Publish, schedule, archive, or unpublish CMS pages',
  1
)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `permission_group` = VALUES(`permission_group`),
  `permission_description` = VALUES(`permission_description`),
  `permission_status` = 1,
  `updated` = current_timestamp();