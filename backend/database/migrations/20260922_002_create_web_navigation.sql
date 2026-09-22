-- ==================================================
-- ==== WEB NAVIGATION
-- ==================================================

CREATE TABLE `web_navigation` (
  `id_web_navigation` int(11) NOT NULL AUTO_INCREMENT,

  `id_master_comp` int(11) NOT NULL,

  `web_navigation_key` varchar(100) NOT NULL,

  `web_navigation_name` varchar(255) NOT NULL,

  `web_navigation_location` varchar(50) NOT NULL DEFAULT 'header',

  `web_navigation_default_locale`
    varchar(20) NOT NULL DEFAULT 'id-ID',

  `web_navigation_status` tinyint(1) NOT NULL DEFAULT 1,

  `web_navigation_settings_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`web_navigation_settings_json`)),

  `id_created_by` int(11) DEFAULT NULL,

  `id_updated_by` int(11) DEFAULT NULL,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  `web_navigation_deleted_at` datetime DEFAULT NULL,

  PRIMARY KEY (`id_web_navigation`),

  UNIQUE KEY `uq_web_navigation_id_company`
    (`id_web_navigation`, `id_master_comp`),

  UNIQUE KEY `uq_web_navigation_company_key`
    (`id_master_comp`, `web_navigation_key`),

  KEY `idx_web_navigation_company_location`
    (
      `id_master_comp`,
      `web_navigation_location`,
      `web_navigation_status`
    ),

  KEY `idx_web_navigation_created_by`
    (`id_created_by`),

  KEY `idx_web_navigation_updated_by`
    (`id_updated_by`),

  CONSTRAINT `fk_web_navigation_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_created_by`
    FOREIGN KEY (`id_created_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_updated_by`
    FOREIGN KEY (`id_updated_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `chk_web_navigation_status`
    CHECK (`web_navigation_status` IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================================================
-- ==== WEB NAVIGATION ITEM
-- ==================================================

CREATE TABLE `web_navigation_item` (
  `id_web_navigation_item` int(11) NOT NULL AUTO_INCREMENT,

  `id_web_navigation` int(11) NOT NULL,

  `id_master_comp` int(11) NOT NULL,

  `id_parent_web_navigation_item` int(11) DEFAULT NULL,

  `id_cms_page` int(11) DEFAULT NULL,

  `web_navigation_item_key` varchar(100) NOT NULL,

  `web_navigation_item_link_type`
    varchar(30) NOT NULL DEFAULT 'internal',

  `web_navigation_item_target_blank`
    tinyint(1) NOT NULL DEFAULT 0,

  `web_navigation_item_icon`
    varchar(100) DEFAULT NULL,

  `web_navigation_item_badge_text`
    varchar(100) DEFAULT NULL,

  `web_navigation_item_badge_color`
    varchar(50) DEFAULT NULL,

  `web_navigation_item_sort_order`
    int(11) NOT NULL DEFAULT 0,

  `web_navigation_item_status`
    tinyint(1) NOT NULL DEFAULT 1,

  `web_navigation_item_settings_json`
    longtext
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin
    DEFAULT NULL
    CHECK (json_valid(`web_navigation_item_settings_json`)),

  `id_created_by` int(11) DEFAULT NULL,

  `id_updated_by` int(11) DEFAULT NULL,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  `web_navigation_item_deleted_at` datetime DEFAULT NULL,

  PRIMARY KEY (`id_web_navigation_item`),

  UNIQUE KEY `uq_web_navigation_item_id_company`
    (`id_web_navigation_item`, `id_master_comp`),

  UNIQUE KEY `uq_web_navigation_item_key`
    (`id_web_navigation`, `web_navigation_item_key`),

  KEY `idx_web_navigation_item_navigation_company`
    (`id_web_navigation`, `id_master_comp`),

  KEY `idx_web_navigation_item_parent`
    (`id_parent_web_navigation_item`),

  KEY `idx_web_navigation_item_cms_page`
    (`id_cms_page`, `id_master_comp`),

  KEY `idx_web_navigation_item_order`
    (
      `id_web_navigation`,
      `id_parent_web_navigation_item`,
      `web_navigation_item_status`,
      `web_navigation_item_sort_order`
    ),

  KEY `idx_web_navigation_item_created_by`
    (`id_created_by`),

  KEY `idx_web_navigation_item_updated_by`
    (`id_updated_by`),

  CONSTRAINT `fk_web_navigation_item_navigation_company`
    FOREIGN KEY (`id_web_navigation`, `id_master_comp`)
    REFERENCES `web_navigation`
      (`id_web_navigation`, `id_master_comp`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_item_parent`
    FOREIGN KEY (`id_parent_web_navigation_item`)
    REFERENCES `web_navigation_item`
      (`id_web_navigation_item`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_item_cms_page_company`
    FOREIGN KEY (`id_cms_page`, `id_master_comp`)
    REFERENCES `cms_page`
      (`id_cms_page`, `id_master_comp`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_item_created_by`
    FOREIGN KEY (`id_created_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_item_updated_by`
    FOREIGN KEY (`id_updated_by`)
    REFERENCES `admin_acct` (`id_admin_acct`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `chk_web_navigation_item_link_type`
    CHECK (
      `web_navigation_item_link_type`
      IN ('cms_page', 'internal', 'external', 'label')
    ),

  CONSTRAINT `chk_web_navigation_item_target_blank`
    CHECK (`web_navigation_item_target_blank` IN (0, 1)),

  CONSTRAINT `chk_web_navigation_item_status`
    CHECK (`web_navigation_item_status` IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================================================
-- ==== WEB NAVIGATION ITEM TRANSLATION
-- ==================================================

CREATE TABLE `web_navigation_item_i18n` (
  `id_web_navigation_item_i18n`
    int(11) NOT NULL AUTO_INCREMENT,

  `id_web_navigation_item` int(11) NOT NULL,

  `id_master_comp` int(11) NOT NULL,

  `web_navigation_item_locale`
    varchar(20) NOT NULL,

  `web_navigation_item_label`
    varchar(255) NOT NULL,

  `web_navigation_item_path`
    varchar(500) DEFAULT NULL,

  `web_navigation_item_url`
    varchar(1000) DEFAULT NULL,

  `web_navigation_item_i18n_status`
    tinyint(1) NOT NULL DEFAULT 1,

  `created` datetime NOT NULL DEFAULT current_timestamp(),

  `updated` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),

  PRIMARY KEY (`id_web_navigation_item_i18n`),

  UNIQUE KEY `uq_web_navigation_item_i18n_locale`
    (
      `id_web_navigation_item`,
      `web_navigation_item_locale`
    ),

  KEY `idx_web_navigation_item_i18n_company_locale`
    (
      `id_master_comp`,
      `web_navigation_item_locale`,
      `web_navigation_item_i18n_status`
    ),

  KEY `idx_web_navigation_item_i18n_item_company`
    (`id_web_navigation_item`, `id_master_comp`),

  CONSTRAINT `fk_web_navigation_item_i18n_item_company`
    FOREIGN KEY (`id_web_navigation_item`, `id_master_comp`)
    REFERENCES `web_navigation_item`
      (`id_web_navigation_item`, `id_master_comp`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_web_navigation_item_i18n_master_comp`
    FOREIGN KEY (`id_master_comp`)
    REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,

  CONSTRAINT `chk_web_navigation_item_i18n_status`
    CHECK (`web_navigation_item_i18n_status` IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;