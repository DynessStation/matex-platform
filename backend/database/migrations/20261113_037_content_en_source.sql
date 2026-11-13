START TRANSACTION;

-- V1.2 Part 3, stage 4: Indonesian is the language people write in; English follows on save.
-- docs/rencana-v1.2-part3.md. For each English field the admin form remembers where its text
-- came from: auto (translated from Indonesian), manual (someone edited it, never overwritten),
-- copy (the translation failed and the Indonesian text stands in). One small table for every
-- content type, so the save endpoints of products, categories, articles, FAQ, and website pages
-- stay as they are.

CREATE TABLE IF NOT EXISTS `content_en_source` (
  `id_content_en_source` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  -- product, product_category, article, faq, website_page
  `content_type` varchar(30) NOT NULL,
  -- The id the admin knows the record by: a hashed id, or the key of a website page.
  `content_ref` varchar(100) NOT NULL,
  -- The field inside the record, as the form names it (name, description, content.items.0.title).
  `field_key` varchar(191) NOT NULL,
  `source` varchar(10) NOT NULL,
  `id_updated_by` int(11) DEFAULT NULL,
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_content_en_source`),
  UNIQUE KEY `uq_content_en_source` (`id_master_comp`, `content_type`, `content_ref`, `field_key`),
  CONSTRAINT `chk_content_en_source` CHECK (`source` IN ('auto', 'manual', 'copy')),
  CONSTRAINT `fk_content_en_source_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
);

COMMIT;
