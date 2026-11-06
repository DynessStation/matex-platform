START TRANSACTION;

-- V1.2 Part 2: HPP, price ladder, sales channels. Everything here is internal: no public query
-- joins these tables, and the API behind them has permissions of its own.

INSERT INTO `admin_permission`
  (`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
  ('cost.view', 'Lihat HPP & Harga', 'HPP & Harga', 'See materials, recipes, HPP, margins, and the calculator', 1),
  ('cost.manage', 'Kelola HPP & Harga', 'HPP & Harga', 'Change materials, recipes, rates, and channels, and import the workbook', 1),
  ('price.apply', 'Terapkan Harga', 'HPP & Harga', 'Copy calculated prices to the prices shown on the website', 1)
ON DUPLICATE KEY UPDATE `permission_group` = VALUES(`permission_group`);

INSERT IGNORE INTO `admin_permission_group` (`permission_group_name`) VALUES ('HPP & Harga');

-- A material, a service, or packaging. Its price lives in cost_material_price.
CREATE TABLE IF NOT EXISTS `cost_material` (
  `id_cost_material` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `cost_material_name` varchar(150) NOT NULL,
  `cost_material_kind` varchar(20) NOT NULL DEFAULT 'material',
  `cost_material_unit` varchar(20) NOT NULL DEFAULT 'pcs',
  `cost_material_note` varchar(255) DEFAULT NULL,
  `cost_material_status` tinyint(1) NOT NULL DEFAULT 1,
  `id_created_by` int DEFAULT NULL,
  `id_updated_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cost_material_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cost_material`),
  UNIQUE KEY `uq_cost_material_id_company` (`id_cost_material`, `id_master_comp`),
  UNIQUE KEY `uq_cost_material_name` (`id_master_comp`, `cost_material_name`),
  CONSTRAINT `fk_cost_material_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `chk_cost_material_kind`
    CHECK (`cost_material_kind` IN ('material', 'service', 'packaging', 'shipping', 'other'))
);

-- Dated prices: the history stays, and a price can be set ahead of its date.
CREATE TABLE IF NOT EXISTS `cost_material_price` (
  `id_cost_material_price` int NOT NULL AUTO_INCREMENT,
  `id_cost_material` int NOT NULL,
  `id_master_comp` int(11) NOT NULL,
  `cost_material_price_amount` decimal(18,2) NOT NULL,
  `cost_material_price_from` date NOT NULL,
  `cost_material_price_note` varchar(255) DEFAULT NULL,
  `id_created_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cost_material_price`),
  UNIQUE KEY `uq_cost_material_price_date` (`id_cost_material`, `cost_material_price_from`),
  KEY `fk_cost_material_price_parent` (`id_cost_material`, `id_master_comp`),
  CONSTRAINT `fk_cost_material_price_parent`
    FOREIGN KEY (`id_cost_material`, `id_master_comp`)
    REFERENCES `cost_material` (`id_cost_material`, `id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- One line of the workbook. Items without a catalog product yet have no id_product.
CREATE TABLE IF NOT EXISTS `cost_item` (
  `id_cost_item` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_product` int DEFAULT NULL,
  `cost_item_key` varchar(190) NOT NULL,
  `cost_item_name` varchar(255) NOT NULL,
  `cost_item_group` varchar(150) DEFAULT NULL,
  `cost_item_length_cm` decimal(10,2) DEFAULT NULL,
  `cost_item_width_cm` decimal(10,2) DEFAULT NULL,
  `cost_item_height_cm` decimal(10,2) DEFAULT NULL,
  `cost_item_gpm` decimal(7,4) DEFAULT NULL,
  `cost_item_affiliate` decimal(7,4) DEFAULT NULL,
  `cost_item_app` decimal(7,4) DEFAULT NULL,
  `cost_item_sort_order` int NOT NULL DEFAULT 0,
  `id_created_by` int DEFAULT NULL,
  `id_updated_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cost_item_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cost_item`),
  UNIQUE KEY `uq_cost_item_id_company` (`id_cost_item`, `id_master_comp`),
  UNIQUE KEY `uq_cost_item_key` (`id_master_comp`, `cost_item_key`),
  UNIQUE KEY `uq_cost_item_product` (`id_master_comp`, `id_product`),
  KEY `fk_cost_item_product` (`id_product`, `id_master_comp`),
  CONSTRAINT `fk_cost_item_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cost_item_product`
    FOREIGN KEY (`id_product`, `id_master_comp`)
    REFERENCES `product_catalog` (`id_product`, `id_master_comp`) ON UPDATE CASCADE
);

-- Saving a recipe adds a version; the last one counts.
CREATE TABLE IF NOT EXISTS `cost_recipe` (
  `id_cost_recipe` int NOT NULL AUTO_INCREMENT,
  `id_cost_item` int NOT NULL,
  `id_master_comp` int(11) NOT NULL,
  `cost_recipe_version` int NOT NULL,
  `cost_recipe_note` varchar(255) DEFAULT NULL,
  `id_created_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cost_recipe`),
  UNIQUE KEY `uq_cost_recipe_version` (`id_cost_item`, `cost_recipe_version`),
  KEY `fk_cost_recipe_parent` (`id_cost_item`, `id_master_comp`),
  CONSTRAINT `fk_cost_recipe_parent`
    FOREIGN KEY (`id_cost_item`, `id_master_comp`)
    REFERENCES `cost_item` (`id_cost_item`, `id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- unit_price set: this line's own price, otherwise the material's price at the date asked for.
CREATE TABLE IF NOT EXISTS `cost_recipe_line` (
  `id_cost_recipe_line` int NOT NULL AUTO_INCREMENT,
  `id_cost_recipe` int NOT NULL,
  `id_cost_material` int DEFAULT NULL,
  `cost_recipe_line_label` varchar(150) NOT NULL,
  `cost_recipe_line_qty` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `cost_recipe_line_formula` varchar(255) DEFAULT NULL,
  `cost_recipe_line_unit_price` decimal(18,6) DEFAULT NULL,
  `cost_recipe_line_sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_cost_recipe_line`),
  KEY `idx_cost_recipe_line_recipe` (`id_cost_recipe`, `cost_recipe_line_sort_order`),
  KEY `idx_cost_recipe_line_material` (`id_cost_material`),
  CONSTRAINT `fk_cost_recipe_line_recipe`
    FOREIGN KEY (`id_cost_recipe`) REFERENCES `cost_recipe` (`id_cost_recipe`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cost_recipe_line_material`
    FOREIGN KEY (`id_cost_material`) REFERENCES `cost_material` (`id_cost_material`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- The general rates of the ladder; an item's own rate overrides them.
CREATE TABLE IF NOT EXISTS `pricing_setting` (
  `id_master_comp` int(11) NOT NULL,
  `pricing_gpm` decimal(7,4) NOT NULL DEFAULT 0.2000,
  `pricing_affiliate` decimal(7,4) NOT NULL DEFAULT 0.0500,
  `pricing_app` decimal(7,4) NOT NULL DEFAULT 0.2000,
  `pricing_wholesale_discount` decimal(7,4) NOT NULL DEFAULT 0.0500,
  `pricing_usd_rate` decimal(12,2) NOT NULL DEFAULT 18000.00,
  `pricing_round_idr` decimal(12,2) NOT NULL DEFAULT 1.00,
  `id_updated_by` int DEFAULT NULL,
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_master_comp`),
  CONSTRAINT `fk_pricing_setting_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `sales_channel` (
  `id_sales_channel` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `sales_channel_key` varchar(60) NOT NULL,
  `sales_channel_name` varchar(100) NOT NULL,
  `sales_channel_status` tinyint(1) NOT NULL DEFAULT 1,
  `sales_channel_sort_order` int NOT NULL DEFAULT 0,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sales_channel_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sales_channel`),
  UNIQUE KEY `uq_sales_channel_id_company` (`id_sales_channel`, `id_master_comp`),
  UNIQUE KEY `uq_sales_channel_key` (`id_master_comp`, `sales_channel_key`),
  CONSTRAINT `fk_sales_channel_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
);

-- Channel charges change a few times a year: a new dated row, not a change of code. Rates are
-- typed in by the team from each Seller Center; none are seeded.
CREATE TABLE IF NOT EXISTS `sales_channel_fee` (
  `id_sales_channel_fee` int NOT NULL AUTO_INCREMENT,
  `id_sales_channel` int NOT NULL,
  `id_master_comp` int(11) NOT NULL,
  `id_product_category` int DEFAULT NULL,
  `sales_channel_fee_name` varchar(100) NOT NULL,
  `sales_channel_fee_type` varchar(10) NOT NULL DEFAULT 'percent',
  `sales_channel_fee_value` decimal(14,4) NOT NULL,
  `sales_channel_fee_cap` decimal(18,2) DEFAULT NULL,
  `sales_channel_fee_per` varchar(10) NOT NULL DEFAULT 'item',
  `sales_channel_fee_from` date NOT NULL,
  `sales_channel_fee_to` date DEFAULT NULL,
  `id_created_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_sales_channel_fee`),
  KEY `fk_sales_channel_fee_parent` (`id_sales_channel`, `id_master_comp`),
  KEY `fk_sales_channel_fee_category` (`id_product_category`, `id_master_comp`),
  CONSTRAINT `fk_sales_channel_fee_parent`
    FOREIGN KEY (`id_sales_channel`, `id_master_comp`)
    REFERENCES `sales_channel` (`id_sales_channel`, `id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_channel_fee_category`
    FOREIGN KEY (`id_product_category`, `id_master_comp`)
    REFERENCES `product_category` (`id_product_category`, `id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_sales_channel_fee_type` CHECK (`sales_channel_fee_type` IN ('percent', 'fixed')),
  CONSTRAINT `chk_sales_channel_fee_per` CHECK (`sales_channel_fee_per` IN ('item', 'order'))
);

COMMIT;
