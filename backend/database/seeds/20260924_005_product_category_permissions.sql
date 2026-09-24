INSERT INTO `admin_permission`
(`permission_key`,`permission_name`,`permission_group`,`permission_description`,`permission_status`)
VALUES
('product_category.view','View Product Categories','Catalog','View product categories',1),
('product_category.create','Create Product Categories','Catalog','Create localized product categories',1),
('product_category.update','Update Product Categories','Catalog','Update localized product categories',1),
('product_category.delete','Delete Product Categories','Catalog','Archive product categories',1)
ON DUPLICATE KEY UPDATE `permission_name`=VALUES(`permission_name`),`permission_group`=VALUES(`permission_group`),`permission_description`=VALUES(`permission_description`),`permission_status`=1,`updated`=current_timestamp();
