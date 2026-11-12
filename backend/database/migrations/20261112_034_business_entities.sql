START TRANSACTION;

-- V1.2 Part 3, stage 1: the parties of the business and their stores. docs/rencana-v1.2-part3.md.
-- An entity is a party with its own books: the platform itself (MIA), a brand of its own
-- (Setia Latex, Rasa Latex), or a B2B partner (Atrija, Koh Joni). A store is one account of an
-- entity on one sales channel. A revenue share rule says who gets what from a store's sales.

INSERT INTO `admin_permission`
  (`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
  ('business.view', 'Lihat Bisnis', 'Bisnis', 'See entities, stores, and revenue share rules', 1),
  ('business.manage', 'Kelola Bisnis', 'Bisnis', 'Add and change entities, stores, and revenue share rules', 1)
ON DUPLICATE KEY UPDATE `permission_group` = VALUES(`permission_group`);

INSERT IGNORE INTO `admin_permission_group` (`permission_group_name`) VALUES ('Bisnis');

CREATE TABLE IF NOT EXISTS `business_entity` (
  `id_business_entity` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `business_entity_kind` varchar(20) NOT NULL DEFAULT 'own_brand',
  `business_entity_name` varchar(150) NOT NULL,
  `business_entity_code` varchar(30) NOT NULL,
  `id_logo_attachment` int(11) DEFAULT NULL,
  `business_entity_contact_name` varchar(150) DEFAULT NULL,
  `business_entity_contact_phone` varchar(30) DEFAULT NULL,
  `business_entity_contact_email` varchar(255) DEFAULT NULL,
  `business_entity_show_on_website` tinyint(1) NOT NULL DEFAULT 0,
  `business_entity_note` text DEFAULT NULL,
  `business_entity_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `business_entity_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_business_entity`),
  UNIQUE KEY `uq_business_entity_id_company` (`id_business_entity`, `id_master_comp`),
  UNIQUE KEY `uq_business_entity_code` (`id_master_comp`, `business_entity_code`),
  KEY `idx_business_entity_kind` (`id_master_comp`, `business_entity_kind`),
  CONSTRAINT `chk_business_entity_kind`
    CHECK (`business_entity_kind` IN ('platform', 'own_brand', 'partner')),
  CONSTRAINT `fk_business_entity_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_business_entity_logo`
    FOREIGN KEY (`id_logo_attachment`) REFERENCES `attachment` (`id_attachment`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Every company is its own platform entity. Existing products and accounts belong to it.
INSERT INTO `business_entity`
  (`id_master_comp`, `business_entity_kind`, `business_entity_name`, `business_entity_code`, `business_entity_status`)
SELECT mc.`id_master_comp`, 'platform', mc.`comp_name`,
  COALESCE(NULLIF(UPPER(LEFT(REGEXP_REPLACE(mc.`comp_alias`, '[^A-Za-z0-9]', ''), 30)), ''),
    CONCAT('ENT', mc.`id_master_comp`)),
  1
FROM `master_comp` mc
WHERE NOT EXISTS (
  SELECT 1 FROM `business_entity` be
  WHERE be.`id_master_comp` = mc.`id_master_comp` AND be.`business_entity_kind` = 'platform'
);

CREATE TABLE IF NOT EXISTS `store` (
  `id_store` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_business_entity` int NOT NULL,
  `id_sales_channel` int NOT NULL,
  `store_name` varchar(150) NOT NULL,
  `store_url` varchar(500) DEFAULT NULL,
  -- The seller or shop id the channel itself uses, so imported reports find the store.
  `store_external_id` varchar(100) DEFAULT NULL,
  `store_note` text DEFAULT NULL,
  `store_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `store_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_store`),
  UNIQUE KEY `uq_store_id_company` (`id_store`, `id_master_comp`),
  KEY `idx_store_entity` (`id_business_entity`, `store_status`),
  KEY `idx_store_channel` (`id_sales_channel`),
  CONSTRAINT `fk_store_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_store_entity`
    FOREIGN KEY (`id_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE,
  CONSTRAINT `fk_store_channel`
    FOREIGN KEY (`id_sales_channel`) REFERENCES `sales_channel` (`id_sales_channel`) ON UPDATE CASCADE
);

-- One case, one dated rule. The components are taken from a sale in order; what is left is the
-- entity's share. A rule for a store beats a rule for the whole entity.
CREATE TABLE IF NOT EXISTS `revenue_share_rule` (
  `id_revenue_share_rule` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_business_entity` int NOT NULL,
  `id_store` int DEFAULT NULL,
  `revenue_share_rule_name` varchar(150) NOT NULL,
  `revenue_share_rule_from` date NOT NULL,
  `revenue_share_rule_to` date DEFAULT NULL,
  `revenue_share_rule_note` text DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `revenue_share_rule_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_revenue_share_rule`),
  KEY `idx_revenue_share_rule_entity` (`id_business_entity`, `revenue_share_rule_from`),
  KEY `idx_revenue_share_rule_store` (`id_store`),
  CONSTRAINT `fk_revenue_share_rule_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_revenue_share_rule_entity`
    FOREIGN KEY (`id_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE,
  CONSTRAINT `fk_revenue_share_rule_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON DELETE SET NULL ON UPDATE CASCADE
);

-- kind: platform_fee (commission to the platform), production_fee (what the platform charges
-- for making the goods), other_fee. type: percent of the base, fixed per item, or cost_plus
-- (the item's HPP plus value percent). base: gross (buyer price) or net (what the channel pays
-- out). The receiver is the platform entity when id_receiver_business_entity is NULL.
CREATE TABLE IF NOT EXISTS `revenue_share_component` (
  `id_revenue_share_component` int NOT NULL AUTO_INCREMENT,
  `id_revenue_share_rule` int NOT NULL,
  `revenue_share_component_order` int NOT NULL DEFAULT 0,
  `revenue_share_component_kind` varchar(20) NOT NULL,
  `revenue_share_component_label` varchar(100) NOT NULL,
  `revenue_share_component_type` varchar(10) NOT NULL DEFAULT 'percent',
  `revenue_share_component_value` decimal(14,4) NOT NULL DEFAULT 0,
  `revenue_share_component_base` varchar(10) NOT NULL DEFAULT 'gross',
  `id_receiver_business_entity` int DEFAULT NULL,
  PRIMARY KEY (`id_revenue_share_component`),
  KEY `idx_revenue_share_component_rule` (`id_revenue_share_rule`, `revenue_share_component_order`),
  CONSTRAINT `chk_revenue_share_component_kind`
    CHECK (`revenue_share_component_kind` IN ('platform_fee', 'production_fee', 'other_fee')),
  CONSTRAINT `chk_revenue_share_component_type`
    CHECK (`revenue_share_component_type` IN ('percent', 'fixed', 'cost_plus')),
  CONSTRAINT `chk_revenue_share_component_base`
    CHECK (`revenue_share_component_base` IN ('gross', 'net')),
  CONSTRAINT `fk_revenue_share_component_rule`
    FOREIGN KEY (`id_revenue_share_rule`) REFERENCES `revenue_share_rule` (`id_revenue_share_rule`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_revenue_share_component_receiver`
    FOREIGN KEY (`id_receiver_business_entity`) REFERENCES `business_entity` (`id_business_entity`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Who sells and who makes each product. Both default to the platform entity of its company.
ALTER TABLE `product_catalog`
  ADD COLUMN `id_seller_business_entity` int DEFAULT NULL AFTER `id_master_comp`,
  ADD COLUMN `id_producer_business_entity` int DEFAULT NULL AFTER `id_seller_business_entity`;

UPDATE `product_catalog` pc
  INNER JOIN `business_entity` be
    ON be.`id_master_comp` = pc.`id_master_comp` AND be.`business_entity_kind` = 'platform'
SET pc.`id_seller_business_entity` = be.`id_business_entity`,
    pc.`id_producer_business_entity` = be.`id_business_entity`
WHERE pc.`id_seller_business_entity` IS NULL OR pc.`id_producer_business_entity` IS NULL;

ALTER TABLE `product_catalog`
  MODIFY COLUMN `id_seller_business_entity` int NOT NULL,
  MODIFY COLUMN `id_producer_business_entity` int NOT NULL,
  ADD KEY `idx_product_seller` (`id_seller_business_entity`),
  ADD KEY `idx_product_producer` (`id_producer_business_entity`),
  ADD CONSTRAINT `fk_product_seller_entity`
    FOREIGN KEY (`id_seller_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_producer_entity`
    FOREIGN KEY (`id_producer_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE;

-- An account tied to an entity (a partner's own login) sees only that entity's data.
-- NULL means the platform's staff, who see everything.
ALTER TABLE `admin_acct`
  ADD COLUMN `id_business_entity` int DEFAULT NULL AFTER `id_access`,
  ADD KEY `idx_admin_acct_business_entity` (`id_business_entity`),
  ADD CONSTRAINT `fk_admin_acct_business_entity`
    FOREIGN KEY (`id_business_entity`) REFERENCES `business_entity` (`id_business_entity`)
    ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
