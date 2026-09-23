-- Localized article foundation for the Kartify blog presentation.
CREATE TABLE `article_category` (
  `id_article_category` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int NOT NULL,
  `article_category_key` varchar(100) NOT NULL,
  `article_category_sort_order` int NOT NULL DEFAULT 0,
  `article_category_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `article_category_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_article_category`),
  UNIQUE KEY `uq_article_category_id_company` (`id_article_category`,`id_master_comp`),
  UNIQUE KEY `uq_article_category_company_key` (`id_master_comp`,`article_category_key`),
  CONSTRAINT `fk_article_category_company` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_category_i18n` (
  `id_article_category_i18n` int NOT NULL AUTO_INCREMENT,
  `id_article_category` int NOT NULL,
  `id_master_comp` int NOT NULL,
  `article_category_locale` varchar(20) NOT NULL,
  `article_category_name` varchar(255) NOT NULL,
  `article_category_description` text DEFAULT NULL,
  `article_category_slug` varchar(255) NOT NULL,
  `article_category_i18n_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_article_category_i18n`),
  UNIQUE KEY `uq_article_category_i18n_locale` (`id_article_category`,`article_category_locale`),
  UNIQUE KEY `uq_article_category_i18n_slug` (`id_master_comp`,`article_category_locale`,`article_category_slug`),
  CONSTRAINT `fk_article_category_i18n_parent` FOREIGN KEY (`id_article_category`,`id_master_comp`) REFERENCES `article_category` (`id_article_category`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_tag` (
  `id_article_tag` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int NOT NULL,
  `article_tag_key` varchar(100) NOT NULL,
  `article_tag_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `article_tag_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_article_tag`),
  UNIQUE KEY `uq_article_tag_id_company` (`id_article_tag`,`id_master_comp`),
  UNIQUE KEY `uq_article_tag_company_key` (`id_master_comp`,`article_tag_key`),
  CONSTRAINT `fk_article_tag_company` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_tag_i18n` (
  `id_article_tag_i18n` int NOT NULL AUTO_INCREMENT,
  `id_article_tag` int NOT NULL,
  `id_master_comp` int NOT NULL,
  `article_tag_locale` varchar(20) NOT NULL,
  `article_tag_name` varchar(255) NOT NULL,
  `article_tag_slug` varchar(255) NOT NULL,
  `article_tag_i18n_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_article_tag_i18n`),
  UNIQUE KEY `uq_article_tag_i18n_locale` (`id_article_tag`,`article_tag_locale`),
  UNIQUE KEY `uq_article_tag_i18n_slug` (`id_master_comp`,`article_tag_locale`,`article_tag_slug`),
  CONSTRAINT `fk_article_tag_i18n_parent` FOREIGN KEY (`id_article_tag`,`id_master_comp`) REFERENCES `article_tag` (`id_article_tag`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article` (
  `id_article` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int NOT NULL,
  `article_key` varchar(120) NOT NULL,
  `article_status` varchar(20) NOT NULL DEFAULT 'draft',
  `article_is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `article_is_sticky` tinyint(1) NOT NULL DEFAULT 0,
  `article_published_at` datetime DEFAULT NULL,
  `article_unpublished_at` datetime DEFAULT NULL,
  `id_author` int DEFAULT NULL,
  `id_created_by` int DEFAULT NULL,
  `id_updated_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `article_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_article`),
  UNIQUE KEY `uq_article_id_company` (`id_article`,`id_master_comp`),
  UNIQUE KEY `uq_article_company_key` (`id_master_comp`,`article_key`),
  KEY `idx_article_public` (`id_master_comp`,`article_status`,`article_published_at`),
  CONSTRAINT `fk_article_company` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `fk_article_author` FOREIGN KEY (`id_author`) REFERENCES `admin_acct` (`id_admin_acct`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_article_created_by` FOREIGN KEY (`id_created_by`) REFERENCES `admin_acct` (`id_admin_acct`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_article_updated_by` FOREIGN KEY (`id_updated_by`) REFERENCES `admin_acct` (`id_admin_acct`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_article_status` CHECK (`article_status` IN ('draft','published','scheduled','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_i18n` (
  `id_article_i18n` int NOT NULL AUTO_INCREMENT,
  `id_article` int NOT NULL,
  `id_master_comp` int NOT NULL,
  `article_locale` varchar(20) NOT NULL,
  `article_slug` varchar(255) NOT NULL,
  `article_title` varchar(500) NOT NULL,
  `article_excerpt` text DEFAULT NULL,
  `article_body` longtext NOT NULL,
  `article_meta_title` varchar(255) DEFAULT NULL,
  `article_meta_description` varchar(500) DEFAULT NULL,
  `article_canonical_url` varchar(1000) DEFAULT NULL,
  `article_og_title` varchar(255) DEFAULT NULL,
  `article_og_description` varchar(500) DEFAULT NULL,
  `article_schema_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`article_schema_json`)),
  `article_i18n_status` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_article_i18n`),
  UNIQUE KEY `uq_article_i18n_locale` (`id_article`,`article_locale`),
  UNIQUE KEY `uq_article_i18n_slug` (`id_master_comp`,`article_locale`,`article_slug`),
  CONSTRAINT `fk_article_i18n_parent` FOREIGN KEY (`id_article`,`id_master_comp`) REFERENCES `article` (`id_article`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_attachment` (
  `id_article_attachment` int NOT NULL AUTO_INCREMENT,
  `id_article` int NOT NULL,
  `id_master_comp` int NOT NULL,
  `id_attachment` int NOT NULL,
  `article_attachment_role` varchar(30) NOT NULL,
  `article_attachment_sort_order` int NOT NULL DEFAULT 0,
  `article_attachment_is_public` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_article_attachment`),
  UNIQUE KEY `uq_article_attachment_role` (`id_article`,`article_attachment_role`,`article_attachment_sort_order`),
  KEY `idx_article_attachment_media` (`id_attachment`),
  CONSTRAINT `fk_article_attachment_parent` FOREIGN KEY (`id_article`,`id_master_comp`) REFERENCES `article` (`id_article`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_article_attachment_media` FOREIGN KEY (`id_attachment`) REFERENCES `attachment` (`id_attachment`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_article_attachment_role` CHECK (`article_attachment_role` IN ('thumbnail','og','inline','gallery'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_category_map` (
  `id_article` int NOT NULL, `id_article_category` int NOT NULL, `id_master_comp` int NOT NULL,
  PRIMARY KEY (`id_article`,`id_article_category`),
  CONSTRAINT `fk_article_category_map_article` FOREIGN KEY (`id_article`,`id_master_comp`) REFERENCES `article` (`id_article`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_article_category_map_category` FOREIGN KEY (`id_article_category`,`id_master_comp`) REFERENCES `article_category` (`id_article_category`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `article_tag_map` (
  `id_article` int NOT NULL, `id_article_tag` int NOT NULL, `id_master_comp` int NOT NULL,
  PRIMARY KEY (`id_article`,`id_article_tag`),
  CONSTRAINT `fk_article_tag_map_article` FOREIGN KEY (`id_article`,`id_master_comp`) REFERENCES `article` (`id_article`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_article_tag_map_tag` FOREIGN KEY (`id_article_tag`,`id_master_comp`) REFERENCES `article_tag` (`id_article_tag`,`id_master_comp`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
