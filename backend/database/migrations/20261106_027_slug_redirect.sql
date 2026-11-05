START TRANSACTION;

-- Addresses that moved (G-7): a slug changed on an article, product, or category leaves its old
-- slug here, so the old address keeps working (301 to the current slug). A live page with the
-- same slug always wins, and taking a slug back removes its row.
CREATE TABLE IF NOT EXISTS `slug_redirect` (
  `id_slug_redirect` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `slug_redirect_entity` varchar(20) NOT NULL,
  `slug_redirect_entity_id` bigint unsigned NOT NULL,
  `slug_redirect_locale` varchar(10) NOT NULL,
  `slug_redirect_old_slug` varchar(255) NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_slug_redirect`),
  UNIQUE KEY `uq_slug_redirect_old` (`id_master_comp`, `slug_redirect_entity`, `slug_redirect_locale`, `slug_redirect_old_slug`),
  KEY `idx_slug_redirect_entity` (`slug_redirect_entity`, `slug_redirect_entity_id`),
  CONSTRAINT `fk_slug_redirect_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,
  CONSTRAINT `chk_slug_redirect_entity`
    CHECK (`slug_redirect_entity` IN ('article', 'product', 'product_category'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
