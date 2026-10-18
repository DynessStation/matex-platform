-- Make the admin permission catalog reproducible from the repository.
--
-- Until now most permission rows existed only in the original database dump,
-- so a database bootstrapped from migrations could not grant any admin feature
-- except website pages. This migration declares every permission key the API
-- checks with requirePermission().
--
-- Existing rows are left untouched (names, descriptions, and status edited in
-- production stay as they are). Only missing keys are inserted, including:
--   * admin_account.create/update/delete, which the API already checks but
--     which were never seeded, so only all-access admins could manage accounts;
--   * content_assistant.use, which now guards the AI content assistant.
--
-- The legacy files in database/seeds/ are superseded by this migration.

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
  ('dashboard.view', 'Lihat Dashboard', 'Dashboard', NULL, 1),

  ('admin_account.view', 'Lihat Akun Admin', 'Admin Account', NULL, 1),
  ('admin_account.create', 'Create Admin Account', 'Admin Account', 'Create administrator accounts', 1),
  ('admin_account.update', 'Update Admin Account', 'Admin Account', 'Update administrator accounts and their status', 1),
  ('admin_account.delete', 'Delete Admin Account', 'Admin Account', 'Delete administrator accounts', 1),

  ('admin_access.view', 'View Admin Access', 'Admin Access', 'View administrator access roles', 1),
  ('admin_access.create', 'Create Admin Access', 'Admin Access', 'Create administrator access roles', 1),
  ('admin_access.update', 'Update Admin Access', 'Admin Access', 'Update administrator access roles', 1),
  ('admin_access.delete', 'Delete Admin Access', 'Admin Access', 'Delete administrator access roles', 1),

  ('admin_permission.view', 'View Admin Permissions', 'Admin Permission', 'View administrator permission definitions', 1),
  ('admin_permission.create', 'Create Admin Permission', 'Admin Permission', 'Create administrator permission definitions', 1),
  ('admin_permission.update', 'Update Admin Permission', 'Admin Permission', 'Update administrator permission definitions', 1),
  ('admin_permission.delete', 'Delete Admin Permission', 'Admin Permission', 'Delete administrator permission definitions', 1),

  ('audit_log.view', 'View Audit Log', 'Audit Log', 'View system audit and activity logs', 1),

  ('chair.view', 'View Chair', 'Chair', 'View administrator chair or position data', 1),
  ('chair.create', 'Create Chair', 'Chair', 'Create administrator chair or position data', 1),
  ('chair.update', 'Update Chair', 'Chair', 'Update administrator chair or position data', 1),
  ('chair.delete', 'Delete Chair', 'Chair', 'Delete administrator chair or position data', 1),

  ('office.view', 'View Office', 'Office', 'View office data', 1),
  ('office.create', 'Create Office', 'Office', 'Create office data', 1),
  ('office.update', 'Update Office', 'Office', 'Update office data', 1),
  ('office.delete', 'Delete Office', 'Office', 'Delete office data', 1),

  ('attachment.view', 'View Attachment', 'Attachment', 'View attachment and media library', 1),
  ('attachment.create', 'Create Attachment', 'Attachment', 'Upload new attachment', 1),
  ('attachment.delete', 'Delete Attachment', 'Attachment', 'Delete attachment from media library', 1),

  ('website_page.view', 'View Website Pages', 'Website', 'View fixed website page content, SEO, media, and publication settings', 1),
  ('website_page.update', 'Update Website Pages', 'Website', 'Update fixed website page content, SEO, media, and publication settings', 1),

  ('web_navigation.view', 'View Web Navigation', 'Web Navigation', 'View website navigation and menu items', 1),
  ('web_navigation.create', 'Create Web Navigation', 'Web Navigation', 'Create website navigation and menu items', 1),
  ('web_navigation.update', 'Update Web Navigation', 'Web Navigation', 'Update website navigation, translations, and ordering', 1),
  ('web_navigation.delete', 'Delete Web Navigation', 'Web Navigation', 'Remove website navigation and menu items', 1),
  ('web_navigation.publish', 'Publish Web Navigation', 'Web Navigation', 'Activate or deactivate website navigation', 1),

  ('article.view', 'View Articles', 'Website Content', 'View website articles', 1),
  ('article.create', 'Create Articles', 'Website Content', 'Create localized website articles', 1),
  ('article.update', 'Update Articles', 'Website Content', 'Update localized website articles', 1),
  ('article.delete', 'Delete Articles', 'Website Content', 'Archive website articles', 1),

  ('faq.view', 'View FAQ', 'Website Content', 'View website frequently asked questions', 1),
  ('faq.create', 'Create FAQ', 'Website Content', 'Create localized website frequently asked questions', 1),
  ('faq.update', 'Update FAQ', 'Website Content', 'Update localized website frequently asked questions', 1),
  ('faq.delete', 'Delete FAQ', 'Website Content', 'Remove website frequently asked questions', 1),

  ('public_contact.view', 'View Public Contact', 'Website Content', 'View public contact channels and inquiry topics', 1),
  ('public_contact.update', 'Update Public Contact', 'Website Content', 'Update public contact channels and inquiry topics', 1),

  ('content_assistant.use', 'Use AI Content Assistant', 'Website Content', 'Generate and translate content drafts with the AI assistant', 1),

  ('product.view', 'View Products', 'Catalog', 'View product catalog', 1),
  ('product.create', 'Create Products', 'Catalog', 'Create localized products', 1),
  ('product.update', 'Update Products', 'Catalog', 'Update localized products', 1),
  ('product.delete', 'Delete Products', 'Catalog', 'Archive products', 1),

  ('product_category.view', 'View Product Categories', 'Catalog', 'View product categories', 1),
  ('product_category.create', 'Create Product Categories', 'Catalog', 'Create localized product categories', 1),
  ('product_category.update', 'Update Product Categories', 'Catalog', 'Update localized product categories', 1),
  ('product_category.delete', 'Delete Product Categories', 'Catalog', 'Archive product categories', 1)
ON DUPLICATE KEY UPDATE
  `permission_key` = `permission_key`;

-- The AI assistant used to be open to every signed-in admin. Keep it available
-- to access profiles that can already edit content, so current editors do not
-- lose the feature. All-access admins bypass permission checks anyway.
INSERT INTO `admin_access_permission`
(
  `id_admin_access`,
  `id_admin_permission`
)
SELECT DISTINCT
  granted.`id_admin_access`,
  assistant.`id_admin_permission`
FROM `admin_access_permission` granted
INNER JOIN `admin_permission` editor
  ON editor.`id_admin_permission` = granted.`id_admin_permission`
INNER JOIN `admin_permission` assistant
  ON assistant.`permission_key` = 'content_assistant.use'
WHERE editor.`permission_key` IN
(
  'article.create',
  'article.update',
  'faq.create',
  'faq.update',
  'product.create',
  'product.update',
  'product_category.create',
  'product_category.update',
  'public_contact.update',
  'website_page.update'
)
AND NOT EXISTS
(
  SELECT 1
  FROM `admin_access_permission` existing
  WHERE existing.`id_admin_access` = granted.`id_admin_access`
    AND existing.`id_admin_permission` = assistant.`id_admin_permission`
);

COMMIT;
