INSERT INTO `admin_permission`
(`permission_key`,`permission_name`,`permission_group`,`permission_description`,`permission_status`)
VALUES
('article.view','View Articles','Website Content','View website articles',1),
('article.create','Create Articles','Website Content','Create localized website articles',1),
('article.update','Update Articles','Website Content','Update localized website articles',1),
('article.delete','Delete Articles','Website Content','Archive website articles',1)
ON DUPLICATE KEY UPDATE `permission_name`=VALUES(`permission_name`),`permission_group`=VALUES(`permission_group`),`permission_description`=VALUES(`permission_description`),`permission_status`=1,`updated`=current_timestamp();
