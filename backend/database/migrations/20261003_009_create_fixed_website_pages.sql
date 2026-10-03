-- Fixed website pages replace the generic CMS page model in stages.
-- This migration is additive: legacy cms_page* tables remain untouched while
-- admin and public consumers are migrated in later releases.

CREATE TABLE IF NOT EXISTS `website_page` (
  `id_website_page` int(11) NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `website_page_key` varchar(50) NOT NULL,
  `website_page_default_locale` varchar(20) NOT NULL DEFAULT 'id-ID',
  `website_page_is_published` tinyint(1) NOT NULL DEFAULT 0,
  `website_page_publish_at` datetime DEFAULT NULL,
  `website_page_unpublish_at` datetime DEFAULT NULL,
  `id_created_by` int(11) DEFAULT NULL,
  `id_updated_by` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_website_page`),
  UNIQUE KEY `uq_website_page_id_company`
    (`id_website_page`, `id_master_comp`),
  UNIQUE KEY `uq_website_page_company_key`
    (`id_master_comp`, `website_page_key`),
  KEY `idx_website_page_publication`
    (`id_master_comp`, `website_page_is_published`, `website_page_publish_at`, `website_page_unpublish_at`),
  KEY `idx_website_page_created_by` (`id_created_by`),
  KEY `idx_website_page_updated_by` (`id_updated_by`),

  CONSTRAINT `fk_website_page_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_website_page_created_by`
    FOREIGN KEY (`id_created_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_website_page_updated_by`
    FOREIGN KEY (`id_updated_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `chk_website_page_is_published`
    CHECK (`website_page_is_published` IN (0, 1)),
  CONSTRAINT `chk_website_page_publish_window`
    CHECK (
      `website_page_unpublish_at` IS NULL
      OR `website_page_publish_at` IS NULL
      OR `website_page_unpublish_at` > `website_page_publish_at`
    )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `website_page_i18n` (
  `id_website_page_i18n` int(11) NOT NULL AUTO_INCREMENT,
  `id_website_page` int(11) NOT NULL,
  `id_master_comp` int(11) NOT NULL,
  `website_page_locale` varchar(20) NOT NULL,
  `website_page_path` varchar(191) NOT NULL,
  `website_page_title` varchar(255) NOT NULL,
  `website_page_summary` text DEFAULT NULL,
  `website_page_body_html` longtext DEFAULT NULL,
  `website_page_content_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`website_page_content_json`)),
  `website_page_seo_title` varchar(255) DEFAULT NULL,
  `website_page_seo_description` varchar(500) DEFAULT NULL,
  `website_page_seo_keywords` varchar(500) DEFAULT NULL,
  `website_page_seo_robots` varchar(100) DEFAULT NULL,
  `website_page_canonical_url` varchar(500) DEFAULT NULL,
  `website_page_social_title` varchar(255) DEFAULT NULL,
  `website_page_social_description` varchar(500) DEFAULT NULL,
  `website_page_schema_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`website_page_schema_json`)),
  `website_page_translation_is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_website_page_i18n`),
  UNIQUE KEY `uq_website_page_i18n_page_locale`
    (`id_website_page`, `website_page_locale`),
  UNIQUE KEY `uq_website_page_i18n_company_locale_path`
    (`id_master_comp`, `website_page_locale`, `website_page_path`),
  KEY `idx_website_page_i18n_publication`
    (`id_master_comp`, `website_page_locale`, `website_page_translation_is_published`),
  KEY `idx_website_page_i18n_page_company`
    (`id_website_page`, `id_master_comp`),

  CONSTRAINT `fk_website_page_i18n_page_company`
    FOREIGN KEY (`id_website_page`, `id_master_comp`)
    REFERENCES `website_page` (`id_website_page`, `id_master_comp`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_website_page_i18n_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,
  CONSTRAINT `chk_website_page_i18n_is_published`
    CHECK (`website_page_translation_is_published` IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `website_page_media` (
  `id_website_page_media` int(11) NOT NULL AUTO_INCREMENT,
  `id_website_page` int(11) NOT NULL,
  `id_attachment` int(11) NOT NULL,
  `website_page_media_slot` varchar(50) NOT NULL,
  `website_page_media_sort_order` int(11) NOT NULL DEFAULT 0,
  `website_page_media_is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `website_page_media_click_action` varchar(20) NOT NULL DEFAULT 'none',
  `website_page_media_click_target` varchar(1000) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_website_page_media`),
  UNIQUE KEY `uq_website_page_media_assignment`
    (`id_website_page`, `id_attachment`, `website_page_media_slot`),
  KEY `idx_website_page_media_slot`
    (`id_website_page`, `website_page_media_slot`, `website_page_media_sort_order`),
  KEY `idx_website_page_media_attachment` (`id_attachment`),

  CONSTRAINT `fk_website_page_media_page`
    FOREIGN KEY (`id_website_page`)
    REFERENCES `website_page` (`id_website_page`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_website_page_media_attachment`
    FOREIGN KEY (`id_attachment`)
    REFERENCES `attachment` (`id_attachment`)
    ON UPDATE CASCADE,
  CONSTRAINT `chk_website_page_media_is_visible`
    CHECK (`website_page_media_is_visible` IN (0, 1)),
  CONSTRAINT `chk_website_page_media_click_action`
    CHECK (`website_page_media_click_action` IN ('none', 'internal', 'external', 'product', 'category'))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `website_page_media_i18n` (
  `id_website_page_media_i18n` int(11) NOT NULL AUTO_INCREMENT,
  `id_website_page_media` int(11) NOT NULL,
  `website_page_media_locale` varchar(20) NOT NULL,
  `website_page_media_caption` varchar(500) DEFAULT NULL,
  `website_page_media_alt_text` varchar(500) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_website_page_media_i18n`),
  UNIQUE KEY `uq_website_page_media_i18n_locale`
    (`id_website_page_media`, `website_page_media_locale`),

  CONSTRAINT `fk_website_page_media_i18n_media`
    FOREIGN KEY (`id_website_page_media`)
    REFERENCES `website_page_media` (`id_website_page_media`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- Copy only fixed pages. Ad-hoc CMS records are intentionally excluded.
INSERT INTO `website_page`
(
  `id_master_comp`,
  `website_page_key`,
  `website_page_default_locale`,
  `website_page_is_published`,
  `website_page_publish_at`,
  `website_page_unpublish_at`,
  `id_created_by`,
  `id_updated_by`,
  `created`,
  `updated`
)
SELECT
  source.`id_master_comp`,
  source.`cms_page_key`,
  source.`cms_page_default_locale`,
  CASE
    WHEN source.`cms_page_status` = 1
      AND source.`cms_page_visibility` IN (1, 2)
    THEN 1
    ELSE 0
  END,
  source.`cms_page_publish_at`,
  source.`cms_page_unpublish_at`,
  source.`id_created_by`,
  source.`id_updated_by`,
  source.`created`,
  source.`updated`
FROM `cms_page` source
WHERE source.`cms_page_key` IN ('home', 'about', 'terms', 'career')
  AND source.`cms_page_deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page` target
    WHERE target.`id_master_comp` = source.`id_master_comp`
      AND target.`website_page_key` = source.`cms_page_key`
  );


INSERT INTO `website_page_i18n`
(
  `id_website_page`,
  `id_master_comp`,
  `website_page_locale`,
  `website_page_path`,
  `website_page_title`,
  `website_page_summary`,
  `website_page_body_html`,
  `website_page_content_json`,
  `website_page_seo_title`,
  `website_page_seo_description`,
  `website_page_seo_keywords`,
  `website_page_seo_robots`,
  `website_page_canonical_url`,
  `website_page_social_title`,
  `website_page_social_description`,
  `website_page_schema_json`,
  `website_page_translation_is_published`,
  `created`,
  `updated`
)
SELECT
  target_page.`id_website_page`,
  source_page.`id_master_comp`,
  source_i18n.`cms_page_locale`,
  CASE
    WHEN source_page.`cms_page_key` = 'about'
      AND source_i18n.`cms_page_locale` = 'id-ID'
    THEN 'tentang-matex'
    WHEN source_page.`cms_page_key` = 'about'
      AND source_i18n.`cms_page_locale` = 'en-US'
    THEN 'about-matex'
    ELSE source_i18n.`cms_page_slug`
  END,
  source_i18n.`cms_page_title`,
  source_i18n.`cms_page_excerpt`,
  source_i18n.`cms_page_content`,
  source_i18n.`cms_page_content_json`,
  source_i18n.`cms_page_meta_title`,
  source_i18n.`cms_page_meta_description`,
  source_i18n.`cms_page_meta_keywords`,
  source_i18n.`cms_page_meta_robots`,
  source_i18n.`cms_page_canonical_url`,
  source_i18n.`cms_page_og_title`,
  source_i18n.`cms_page_og_description`,
  source_i18n.`cms_page_schema_json`,
  source_i18n.`cms_page_i18n_status`,
  source_i18n.`created`,
  source_i18n.`updated`
FROM `cms_page` source_page
INNER JOIN `cms_page_i18n` source_i18n
  ON source_i18n.`id_cms_page` = source_page.`id_cms_page`
  AND source_i18n.`id_master_comp` = source_page.`id_master_comp`
INNER JOIN `website_page` target_page
  ON target_page.`id_master_comp` = source_page.`id_master_comp`
  AND target_page.`website_page_key` = source_page.`cms_page_key`
WHERE source_page.`cms_page_key` IN ('home', 'about', 'terms', 'career')
  AND source_page.`cms_page_deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_i18n` target_i18n
    WHERE target_i18n.`id_website_page` = target_page.`id_website_page`
      AND target_i18n.`website_page_locale` = source_i18n.`cms_page_locale`
  );


INSERT INTO `website_page_media`
(
  `id_website_page`,
  `id_attachment`,
  `website_page_media_slot`,
  `website_page_media_sort_order`,
  `website_page_media_is_visible`,
  `website_page_media_click_action`,
  `website_page_media_click_target`,
  `created`,
  `updated`
)
SELECT
  target_page.`id_website_page`,
  source_media.`id_attachment`,
  CASE
    WHEN source_page.`cms_page_key` = 'about'
      AND source_media.`cms_page_attachment_role` = 'hero'
    THEN 'about_content'
    ELSE source_media.`cms_page_attachment_role`
  END,
  source_media.`cms_page_attachment_sort_order`,
  source_media.`cms_page_attachment_is_public`,
  source_media.`cms_page_attachment_action_type`,
  source_media.`cms_page_attachment_action_value`,
  source_media.`created`,
  source_media.`updated`
FROM `cms_page` source_page
INNER JOIN `cms_page_attachment` source_media
  ON source_media.`id_cms_page` = source_page.`id_cms_page`
INNER JOIN `website_page` target_page
  ON target_page.`id_master_comp` = source_page.`id_master_comp`
  AND target_page.`website_page_key` = source_page.`cms_page_key`
WHERE source_page.`cms_page_key` IN ('home', 'about', 'terms', 'career')
  AND source_page.`cms_page_deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_media` target_media
    WHERE target_media.`id_website_page` = target_page.`id_website_page`
      AND target_media.`id_attachment` = source_media.`id_attachment`
      AND target_media.`website_page_media_slot` = CASE
        WHEN source_page.`cms_page_key` = 'about'
          AND source_media.`cms_page_attachment_role` = 'hero'
        THEN 'about_content'
        ELSE source_media.`cms_page_attachment_role`
      END
  );


INSERT INTO `website_page_media_i18n`
(
  `id_website_page_media`,
  `website_page_media_locale`,
  `website_page_media_caption`,
  `website_page_media_alt_text`,
  `created`,
  `updated`
)
SELECT
  target_media.`id_website_page_media`,
  source_media_i18n.`cms_page_attachment_locale`,
  source_media_i18n.`cms_page_attachment_caption`,
  source_media_i18n.`cms_page_attachment_alt_text`,
  source_media_i18n.`created`,
  source_media_i18n.`updated`
FROM `cms_page` source_page
INNER JOIN `cms_page_attachment` source_media
  ON source_media.`id_cms_page` = source_page.`id_cms_page`
INNER JOIN `cms_page_attachment_i18n` source_media_i18n
  ON source_media_i18n.`id_cms_page_attachment` = source_media.`id_cms_page_attachment`
INNER JOIN `website_page` target_page
  ON target_page.`id_master_comp` = source_page.`id_master_comp`
  AND target_page.`website_page_key` = source_page.`cms_page_key`
INNER JOIN `website_page_media` target_media
  ON target_media.`id_website_page` = target_page.`id_website_page`
  AND target_media.`id_attachment` = source_media.`id_attachment`
  AND target_media.`website_page_media_slot` = CASE
    WHEN source_page.`cms_page_key` = 'about'
      AND source_media.`cms_page_attachment_role` = 'hero'
    THEN 'about_content'
    ELSE source_media.`cms_page_attachment_role`
  END
WHERE source_page.`cms_page_key` IN ('home', 'about', 'terms', 'career')
  AND source_page.`cms_page_deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_media_i18n` target_media_i18n
    WHERE target_media_i18n.`id_website_page_media` = target_media.`id_website_page_media`
      AND target_media_i18n.`website_page_media_locale` = source_media_i18n.`cms_page_attachment_locale`
  );
