-- ==================================================
-- ==== CMS PAGE
-- ==================================================

CREATE TABLE `cms_page` (
  `id_cms_page` int(11) NOT NULL AUTO_INCREMENT,

  `id_master_comp` int(11) NOT NULL,

  `id_parent_cms_page` int(11) DEFAULT NULL,

  `cms_page_key` varchar(100) NOT NULL,

  `cms_page_type` varchar(50) NOT NULL DEFAULT 'standard',

  `cms_page_template` varchar(100) DEFAULT NULL,

  `cms_page_content_mode` varchar(30) NOT NULL DEFAULT 'html',

  `cms_page_default_locale` varchar(20) NOT NULL DEFAULT 'id-ID',

  `cms_page_status` tinyint(4) NOT NULL DEFAULT 0,

  `cms_page_visibility` tinyint(4) NOT NULL DEFAULT 1,

  `cms_page_is_system` tinyint(1) NOT NULL DEFAULT 0,

  `cms_page_is_featured` tinyint(1) NOT NULL DEFAULT 0,

  `cms_page_sort_order` int(11) NOT NULL DEFAULT 0,

  `cms_page_publish_at` datetime DEFAULT NULL,

  `cms_page_unpublish_at` datetime DEFAULT NULL,

  `cms_page_settings_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`cms_page_settings_json`)),

  `id_created_by` int(11) DEFAULT NULL,

  `id_updated_by` int(11) DEFAULT NULL,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  `cms_page_deleted_at` datetime DEFAULT NULL,

  PRIMARY KEY (`id_cms_page`),

UNIQUE KEY `uq_cms_page_id_company`
  (`id_cms_page`, `id_master_comp`),

UNIQUE KEY `uq_cms_page_company_key`
  (`id_master_comp`, `cms_page_key`),

  KEY `idx_cms_page_company_status`
    (`id_master_comp`, `cms_page_status`, `cms_page_visibility`),

  KEY `idx_cms_page_company_type`
    (`id_master_comp`, `cms_page_type`, `cms_page_status`),

  KEY `idx_cms_page_parent`
    (`id_parent_cms_page`),

  KEY `idx_cms_page_publish_window`
    (`cms_page_status`, `cms_page_publish_at`, `cms_page_unpublish_at`),

  KEY `idx_cms_page_sort`
    (`id_master_comp`, `cms_page_sort_order`),

  KEY `idx_cms_page_created_by`
    (`id_created_by`),

  KEY `idx_cms_page_updated_by`
    (`id_updated_by`),

  CONSTRAINT `fk_cms_page_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,

  CONSTRAINT `fk_cms_page_parent`
    FOREIGN KEY (`id_parent_cms_page`)
    REFERENCES `cms_page` (`id_cms_page`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_cms_page_created_by`
    FOREIGN KEY (`id_created_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_cms_page_updated_by`
    FOREIGN KEY (`id_updated_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `chk_cms_page_status`
    CHECK (`cms_page_status` IN (0, 1, 2)),

  CONSTRAINT `chk_cms_page_visibility`
    CHECK (`cms_page_visibility` IN (0, 1, 2)),

  CONSTRAINT `chk_cms_page_publish_window`
    CHECK (
      `cms_page_unpublish_at` IS NULL
      OR `cms_page_publish_at` IS NULL
      OR `cms_page_unpublish_at` > `cms_page_publish_at`
    )
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================================================
-- ==== CMS PAGE TRANSLATION
-- ==================================================

CREATE TABLE `cms_page_i18n` (
  `id_cms_page_i18n` int(11) NOT NULL AUTO_INCREMENT,

  `id_cms_page` int(11) NOT NULL,

  `id_master_comp` int(11) NOT NULL,

  `cms_page_locale` varchar(20) NOT NULL,

  `cms_page_slug` varchar(191) NOT NULL,

  `cms_page_title` varchar(255) NOT NULL,

  `cms_page_excerpt` text DEFAULT NULL,

  `cms_page_content` longtext DEFAULT NULL,

  `cms_page_content_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`cms_page_content_json`)),

  `cms_page_meta_title` varchar(255) DEFAULT NULL,

  `cms_page_meta_description` varchar(500) DEFAULT NULL,

  `cms_page_meta_keywords` varchar(500) DEFAULT NULL,

  `cms_page_meta_robots` varchar(100) DEFAULT NULL,

  `cms_page_canonical_url` varchar(500) DEFAULT NULL,

  `cms_page_og_title` varchar(255) DEFAULT NULL,

  `cms_page_og_description` varchar(500) DEFAULT NULL,

  `cms_page_schema_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`cms_page_schema_json`)),

  `cms_page_i18n_status` tinyint(4) NOT NULL DEFAULT 0,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_cms_page_i18n`),

  UNIQUE KEY `uq_cms_page_i18n_page_locale`
    (`id_cms_page`, `cms_page_locale`),

  UNIQUE KEY `uq_cms_page_i18n_company_locale_slug`
    (`id_master_comp`, `cms_page_locale`, `cms_page_slug`),

  KEY `idx_cms_page_i18n_page_status`
    (`id_cms_page`, `cms_page_i18n_status`),

  KEY `idx_cms_page_i18n_locale_status`
    (`id_master_comp`, `cms_page_locale`, `cms_page_i18n_status`),

  KEY `idx_cms_page_i18n_title`
    (`cms_page_title`),

  KEY `idx_cms_page_i18n_page_company`
  (`id_cms_page`, `id_master_comp`),

CONSTRAINT `fk_cms_page_i18n_page_company`
  FOREIGN KEY (`id_cms_page`, `id_master_comp`)
  REFERENCES `cms_page` (`id_cms_page`, `id_master_comp`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,

  CONSTRAINT `fk_cms_page_i18n_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,

  CONSTRAINT `chk_cms_page_i18n_status`
    CHECK (`cms_page_i18n_status` IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================================================
-- ==== CMS PAGE ATTACHMENT
-- ==================================================

CREATE TABLE `cms_page_attachment` (
  `id_cms_page_attachment` int(11) NOT NULL AUTO_INCREMENT,

  `id_cms_page` int(11) NOT NULL,

  `id_attachment` int(11) NOT NULL,

  `cms_page_attachment_role` varchar(50) NOT NULL DEFAULT 'gallery',

  `cms_page_attachment_sort_order` int(11) NOT NULL DEFAULT 0,

  `cms_page_attachment_is_public` tinyint(1) NOT NULL DEFAULT 1,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_cms_page_attachment`),

  UNIQUE KEY `uq_cms_page_attachment`
    (
      `id_cms_page`,
      `id_attachment`,
      `cms_page_attachment_role`
    ),

  KEY `idx_cms_page_attachment_page_role`
    (
      `id_cms_page`,
      `cms_page_attachment_role`,
      `cms_page_attachment_sort_order`
    ),

  KEY `idx_cms_page_attachment_attachment`
    (`id_attachment`),

  CONSTRAINT `fk_cms_page_attachment_page`
    FOREIGN KEY (`id_cms_page`)
    REFERENCES `cms_page` (`id_cms_page`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_cms_page_attachment_attachment`
    FOREIGN KEY (`id_attachment`)
    REFERENCES `attachment` (`id_attachment`)
    ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================================================
-- ==== CMS PAGE ATTACHMENT TRANSLATION
-- ==================================================

CREATE TABLE `cms_page_attachment_i18n` (
  `id_cms_page_attachment_i18n` int(11) NOT NULL AUTO_INCREMENT,

  `id_cms_page_attachment` int(11) NOT NULL,

  `cms_page_attachment_locale` varchar(20) NOT NULL,

  `cms_page_attachment_caption` varchar(500) DEFAULT NULL,

  `cms_page_attachment_alt_text` varchar(500) DEFAULT NULL,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_cms_page_attachment_i18n`),

  UNIQUE KEY `uq_cms_page_attachment_i18n_locale`
    (`id_cms_page_attachment`, `cms_page_attachment_locale`),

  CONSTRAINT `fk_cms_page_attachment_i18n_attachment`
    FOREIGN KEY (`id_cms_page_attachment`)
    REFERENCES `cms_page_attachment` (`id_cms_page_attachment`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;