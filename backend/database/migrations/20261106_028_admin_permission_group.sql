START TRANSACTION;

-- Permission groups get their own list (V1.2 Part 1), so a group can exist before it has
-- permissions and be renamed in one place. admin_permission.permission_group stays the link:
-- it holds the group's name, which is what the access profile form groups by.
CREATE TABLE IF NOT EXISTS `admin_permission_group` (
  `id_admin_permission_group` int(11) NOT NULL AUTO_INCREMENT,
  `permission_group_name` varchar(100) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_admin_permission_group`),
  UNIQUE KEY `uq_admin_permission_group_name` (`permission_group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `admin_permission_group` (`permission_group_name`)
SELECT DISTINCT `permission_group`
FROM `admin_permission`
WHERE `permission_group` IS NOT NULL AND `permission_group` <> ''
  AND `permission_deleted_at` IS NULL;

COMMIT;
