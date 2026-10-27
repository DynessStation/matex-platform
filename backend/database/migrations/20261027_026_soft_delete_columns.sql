START TRANSACTION;

-- One soft delete (A-3): a deleted row keeps its data and gets a deletion time in a
-- *_deleted_at column; the status column only says active (1) or inactive (0). These five
-- tables marked deleted rows with status 99 instead. `updated` keeps its value: the rows
-- deleted before this migration take their last change as the deletion time.

ALTER TABLE `admin_acct`
  ADD COLUMN `admin_acct_deleted_at` datetime DEFAULT NULL AFTER `admin_acct_status`;
ALTER TABLE `admin_access`
  ADD COLUMN `admin_access_deleted_at` datetime DEFAULT NULL AFTER `admin_access_status`;
ALTER TABLE `admin_permission`
  ADD COLUMN `permission_deleted_at` datetime DEFAULT NULL AFTER `permission_status`;
ALTER TABLE `chair`
  ADD COLUMN `chair_deleted_at` datetime DEFAULT NULL AFTER `chair_status`;
ALTER TABLE `office`
  ADD COLUMN `deleted_at` datetime DEFAULT NULL AFTER `status`;

UPDATE `admin_acct`
SET `admin_acct_deleted_at` = `updated`, `admin_acct_status` = 0, `updated` = `updated`
WHERE `admin_acct_status` = 99;

UPDATE `admin_access`
SET `admin_access_deleted_at` = `updated`, `admin_access_status` = 0, `updated` = `updated`
WHERE `admin_access_status` = 99;

UPDATE `admin_permission`
SET `permission_deleted_at` = `updated`, `permission_status` = 0, `updated` = `updated`
WHERE `permission_status` = 99;

UPDATE `chair`
SET `chair_deleted_at` = `updated`, `chair_status` = 0, `updated` = `updated`
WHERE `chair_status` = 99;

UPDATE `office`
SET `deleted_at` = `updated`, `status` = 0, `updated` = `updated`
WHERE `status` = 99;

-- Attachments already had deleted_at and also set status 99.
UPDATE `attachment`
SET `deleted_at` = COALESCE(`deleted_at`, `updated`), `attachment_status` = 0, `updated` = `updated`
WHERE `attachment_status` = 99;

COMMIT;
