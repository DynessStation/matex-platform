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
  'web_navigation.view',
  'View Web Navigation',
  'Web Navigation',
  'View website navigation and menu items',
  1
),
(
  'web_navigation.create',
  'Create Web Navigation',
  'Web Navigation',
  'Create website navigation and menu items',
  1
),
(
  'web_navigation.update',
  'Update Web Navigation',
  'Web Navigation',
  'Update website navigation, translations, and ordering',
  1
),
(
  'web_navigation.delete',
  'Delete Web Navigation',
  'Web Navigation',
  'Remove website navigation and menu items',
  1
),
(
  'web_navigation.publish',
  'Publish Web Navigation',
  'Web Navigation',
  'Activate or deactivate website navigation',
  1
)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `permission_group` = VALUES(`permission_group`),
  `permission_description` = VALUES(`permission_description`),
  `permission_status` = 1,
  `updated` = current_timestamp();