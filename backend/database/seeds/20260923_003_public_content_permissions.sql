INSERT INTO `admin_permission`
(`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
('faq.view', 'View FAQ', 'Website Content', 'View website frequently asked questions', 1),
('faq.create', 'Create FAQ', 'Website Content', 'Create localized website frequently asked questions', 1),
('faq.update', 'Update FAQ', 'Website Content', 'Update localized website frequently asked questions', 1),
('faq.delete', 'Delete FAQ', 'Website Content', 'Remove website frequently asked questions', 1),
('public_contact.view', 'View Public Contact', 'Website Content', 'View public contact channels and inquiry topics', 1),
('public_contact.update', 'Update Public Contact', 'Website Content', 'Update public contact channels and inquiry topics', 1)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `permission_group` = VALUES(`permission_group`),
  `permission_description` = VALUES(`permission_description`),
  `permission_status` = 1,
  `updated` = current_timestamp();
