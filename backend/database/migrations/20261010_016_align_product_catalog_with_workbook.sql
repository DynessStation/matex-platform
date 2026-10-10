-- Align the product catalog with the October 2026 MATEX workbook.
-- These columns are additive so existing API consumers keep working.

ALTER TABLE `product_catalog`
  ADD COLUMN `product_kind` varchar(120) DEFAULT NULL AFTER `product_type`,
  ADD COLUMN `product_origin_province` varchar(100) DEFAULT NULL AFTER `product_country_origin`,
  ADD COLUMN `product_origin_city` varchar(100) DEFAULT NULL AFTER `product_origin_province`;

