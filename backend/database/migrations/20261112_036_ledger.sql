START TRANSACTION;

-- V1.2 Part 3, stage 3: the book of each party. docs/rencana-v1.2-part3.md.
-- Every settled order is split by the revenue share rule into rows per party: what the store's
-- owner owes the platform (fees), what the platform owes a partner whose product sold in its
-- store (share). Rows are never changed: a correction is a new row, and the balance is the sum.
-- A payment between parties is a row too; the money itself moves outside the panel.

INSERT INTO `admin_permission`
  (`permission_key`, `permission_name`, `permission_group`, `permission_description`, `permission_status`)
VALUES
  ('money.view', 'Lihat Dasbor Uang', 'Bisnis', 'See the money dashboard and the book of each party', 1),
  ('money.manage', 'Kelola Buku', 'Bisnis', 'Record payments between parties and rebuild the books', 1)
ON DUPLICATE KEY UPDATE `permission_group` = VALUES(`permission_group`);

-- amount is signed from the point of view of the entity whose book this is: positive is money
-- the counter party owes it, negative is money it owes the counter party.
-- kind: share (its part of a sale made through another party's store), platform_fee,
-- production_fee, other_fee (the components of a rule), payment (money moved between parties).
CREATE TABLE IF NOT EXISTS `ledger_entry` (
  `id_ledger_entry` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_business_entity` int NOT NULL,
  `id_counter_business_entity` int NOT NULL,
  `id_store` int DEFAULT NULL,
  `id_sales_settlement` int DEFAULT NULL,
  `id_revenue_share_rule` int DEFAULT NULL,
  `ledger_entry_kind` varchar(20) NOT NULL,
  `ledger_entry_date` date NOT NULL,
  `ledger_entry_label` varchar(150) NOT NULL DEFAULT '',
  `ledger_entry_amount` decimal(14,2) NOT NULL DEFAULT 0,
  `ledger_entry_note` text DEFAULT NULL,
  `id_created_by` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_ledger_entry`),
  KEY `idx_ledger_entry_book` (`id_business_entity`, `ledger_entry_date`),
  KEY `idx_ledger_entry_counter` (`id_counter_business_entity`),
  KEY `idx_ledger_entry_settlement` (`id_sales_settlement`),
  KEY `idx_ledger_entry_store` (`id_store`),
  KEY `idx_ledger_entry_rule` (`id_revenue_share_rule`),
  CONSTRAINT `chk_ledger_entry_kind`
    CHECK (`ledger_entry_kind` IN ('share', 'platform_fee', 'production_fee', 'other_fee', 'payment')),
  CONSTRAINT `fk_ledger_entry_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_entity`
    FOREIGN KEY (`id_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_counter`
    FOREIGN KEY (`id_counter_business_entity`) REFERENCES `business_entity` (`id_business_entity`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_store`
    FOREIGN KEY (`id_store`) REFERENCES `store` (`id_store`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_settlement`
    FOREIGN KEY (`id_sales_settlement`) REFERENCES `sales_settlement` (`id_sales_settlement`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_rule`
    FOREIGN KEY (`id_revenue_share_rule`) REFERENCES `revenue_share_rule` (`id_revenue_share_rule`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

COMMIT;
