START TRANSACTION;

-- V1.2 Part 1, the Email menu. Mail stays at Hostinger; these say who may read and act on it.
INSERT INTO `admin_permission`
  (`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
  ('email.view', 'Lihat Email', 'Email', 'Read the mailboxes and mark messages read or unread', 1),
  ('email.send', 'Kirim Email', 'Email', 'Send, reply to, and forward messages', 1),
  ('email.manage', 'Kelola Email', 'Email', 'Move messages to the trash', 1)
ON DUPLICATE KEY UPDATE `permission_group` = VALUES(`permission_group`);

INSERT IGNORE INTO `admin_permission_group` (`permission_group_name`) VALUES ('Email');

COMMIT;
