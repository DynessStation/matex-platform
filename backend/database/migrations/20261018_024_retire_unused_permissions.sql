-- Retire permission rows that no API route checks.
--
-- * contoh.view: placeholder created while testing the permission screen.
-- * category_product.*: legacy keys replaced by product_category.*.
-- (dummy.vie and test_module.view are already soft-deleted.)
--
-- Follows the admin panel's own delete rule: unassign the permission from
-- every access role first, then soft-delete it (permission_status = 99) so it
-- disappears from the admin screens but stays recoverable.

START TRANSACTION;

DELETE access_permission
FROM `admin_access_permission` access_permission
INNER JOIN `admin_permission` permission
  ON permission.`id_admin_permission` = access_permission.`id_admin_permission`
WHERE permission.`permission_key` IN
(
  'contoh.view',
  'category_product.view',
  'category_product.create',
  'category_product.update',
  'category_product.delete'
);

UPDATE `admin_permission`
SET `permission_status` = 99
WHERE `permission_key` IN
(
  'contoh.view',
  'category_product.view',
  'category_product.create',
  'category_product.update',
  'category_product.delete'
)
  AND `permission_status` <> 99;

COMMIT;
