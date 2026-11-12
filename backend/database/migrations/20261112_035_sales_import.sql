START TRANSACTION;

-- V1.2 Part 3, stage 2: sales that reach the panel through Seller Center files.
-- docs/rencana-v1.2-part3.md. Two files per store: the order export (what sold) and the income
-- statement (what the channel really paid out). The same tables are meant for the marketplace
-- APIs later, so a row carries the channel's own ids and nothing about how it arrived.

INSERT INTO `admin_permission`
  (`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
  ('sales.view', 'Lihat Penjualan', 'Bisnis', 'See imported orders, payouts, and the SKU map', 1),
  ('sales.import', 'Impor Penjualan', 'Bisnis', 'Import Seller Center files and map SKUs to products', 1)
ON DUPLICATE KEY UPDATE `permission_group` = VALUES(`permission_group`);

-- One upload. The file itself is never kept: only what it changed.
CREATE TABLE IF NOT EXISTS `sales_import` (
  `id_sales_import` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_store` int NOT NULL,
  `sales_import_kind` varchar(20) NOT NULL,
  `sales_import_file` varchar(255) NOT NULL,
  `sales_import_rows` int NOT NULL DEFAULT 0,
  `sales_import_new` int NOT NULL DEFAULT 0,
  `sales_import_updated` int NOT NULL DEFAULT 0,
  `sales_import_from` date DEFAULT NULL,
  `sales_import_to` date DEFAULT NULL,
  `id_created_by` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sales_import`),
  KEY `idx_sales_import_store` (`id_store`, `created`),
  CONSTRAINT `chk_sales_import_kind` CHECK (`sales_import_kind` IN ('orders', 'settlement')),
  CONSTRAINT `fk_sales_import_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_import_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON UPDATE CASCADE
);

-- An order as the channel reports it. The channel's order id is unique per store, so the same
-- file twice changes nothing and a newer export updates the status.
CREATE TABLE IF NOT EXISTS `sales_order` (
  `id_sales_order` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_store` int NOT NULL,
  `sales_order_ref` varchar(50) NOT NULL,
  `sales_order_status` varchar(60) NOT NULL DEFAULT '',
  `sales_order_at` datetime DEFAULT NULL,
  `sales_order_paid_at` datetime DEFAULT NULL,
  `sales_order_payment_method` varchar(60) DEFAULT NULL,
  `sales_order_province` varchar(100) DEFAULT NULL,
  `sales_order_city` varchar(100) DEFAULT NULL,
  `sales_order_source` varchar(60) DEFAULT NULL,
  `sales_order_amount` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_order_shipping_fee` decimal(14,2) NOT NULL DEFAULT 0,
  `id_sales_import` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_sales_order`),
  UNIQUE KEY `uq_sales_order_ref` (`id_store`, `sales_order_ref`),
  KEY `idx_sales_order_company_at` (`id_master_comp`, `sales_order_at`),
  CONSTRAINT `fk_sales_order_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_order_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_order_import`
    FOREIGN KEY (`id_sales_import`) REFERENCES `sales_import` (`id_sales_import`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- One SKU of an order. The product behind it comes from store_sku_map at read time, so a map
-- made later counts for every order already imported.
CREATE TABLE IF NOT EXISTS `sales_order_line` (
  `id_sales_order_line` int NOT NULL AUTO_INCREMENT,
  `id_sales_order` int NOT NULL,
  `sales_order_line_sku_ref` varchar(50) NOT NULL DEFAULT '',
  `sales_order_line_seller_sku` varchar(150) DEFAULT NULL,
  `sales_order_line_product_name` varchar(255) DEFAULT NULL,
  `sales_order_line_variation` varchar(150) DEFAULT NULL,
  `sales_order_line_qty` int NOT NULL DEFAULT 0,
  `sales_order_line_returned_qty` int NOT NULL DEFAULT 0,
  `sales_order_line_unit_price` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_order_line_discount_platform` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_order_line_discount_seller` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_order_line_subtotal` decimal(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_sales_order_line`),
  KEY `idx_sales_order_line_order` (`id_sales_order`),
  KEY `idx_sales_order_line_sku` (`sales_order_line_sku_ref`),
  CONSTRAINT `fk_sales_order_line_order`
    FOREIGN KEY (`id_sales_order`) REFERENCES `sales_order` (`id_sales_order`)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- What the channel paid out, per order or per adjustment that is not an order (ads, fees).
-- amount is the money that reached the seller; revenue and fees are the channel's own totals;
-- detail keeps every non-zero column of the statement as JSON, so new fee columns never break
-- an import and the dashboard can still show them.
CREATE TABLE IF NOT EXISTS `sales_settlement` (
  `id_sales_settlement` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_store` int NOT NULL,
  `sales_settlement_ref` varchar(50) NOT NULL,
  `sales_settlement_kind` varchar(20) NOT NULL DEFAULT 'order',
  `sales_settlement_label` varchar(150) NOT NULL DEFAULT '',
  `sales_settlement_order_ref` varchar(50) DEFAULT NULL,
  `sales_settlement_order_at` date DEFAULT NULL,
  `sales_settlement_settled_at` date DEFAULT NULL,
  `sales_settlement_amount` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_settlement_revenue` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_settlement_fees` decimal(14,2) NOT NULL DEFAULT 0,
  `sales_settlement_source` varchar(60) DEFAULT NULL,
  `sales_settlement_detail` json DEFAULT NULL,
  `id_sales_import` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_sales_settlement`),
  UNIQUE KEY `uq_sales_settlement_ref` (`id_store`, `sales_settlement_ref`),
  KEY `idx_sales_settlement_company_at` (`id_master_comp`, `sales_settlement_settled_at`),
  KEY `idx_sales_settlement_order` (`id_store`, `sales_settlement_order_ref`),
  CONSTRAINT `chk_sales_settlement_kind` CHECK (`sales_settlement_kind` IN ('order', 'adjustment')),
  CONSTRAINT `fk_sales_settlement_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_settlement_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_settlement_import`
    FOREIGN KEY (`id_sales_import`) REFERENCES `sales_import` (`id_sales_import`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- The channel's SKU id of a store, mapped once to a product of ours. Rows appear on import with
-- the names the file gives; the team fills id_product in the panel.
CREATE TABLE IF NOT EXISTS `store_sku_map` (
  `id_store_sku_map` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_store` int NOT NULL,
  `store_sku_map_ref` varchar(50) NOT NULL,
  `store_sku_map_seller_sku` varchar(150) DEFAULT NULL,
  `store_sku_map_product_name` varchar(255) DEFAULT NULL,
  `store_sku_map_variation` varchar(150) DEFAULT NULL,
  `id_product` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_store_sku_map`),
  UNIQUE KEY `uq_store_sku_map_ref` (`id_store`, `store_sku_map_ref`),
  KEY `idx_store_sku_map_product` (`id_product`),
  CONSTRAINT `fk_store_sku_map_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_store_sku_map_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON UPDATE CASCADE,
  CONSTRAINT `fk_store_sku_map_product`
    FOREIGN KEY (`id_product`) REFERENCES `product_catalog` (`id_product`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

COMMIT;
