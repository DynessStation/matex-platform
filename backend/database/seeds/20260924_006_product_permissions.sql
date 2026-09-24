INSERT INTO admin_permission (permission_key,permission_name,permission_group,permission_description,permission_status)
VALUES
('product.view','View Products','Catalog','View product catalog',1),
('product.create','Create Products','Catalog','Create localized products',1),
('product.update','Update Products','Catalog','Update localized products',1),
('product.delete','Delete Products','Catalog','Archive products',1)
ON DUPLICATE KEY UPDATE permission_name=VALUES(permission_name),permission_group=VALUES(permission_group),permission_description=VALUES(permission_description),permission_status=1,updated=current_timestamp();
