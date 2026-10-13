-- MATEX v1 core schema baseline.
-- Contains structure only. It intentionally excludes accounts, password hashes, and other live data.
-- Safe to run before the numbered feature migrations on a new MariaDB/MySQL database.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `master_comp` (
  `id_master_comp` int(255) NOT NULL AUTO_INCREMENT,
  `comp_name` varchar(255) NOT NULL,
  `comp_alias` varchar(50) NOT NULL,
  `serial_num` bigint(20) NOT NULL,
  `id_comp_category` int(255) NOT NULL,
  `comp_lvl` int(50) NOT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  `comp_status` int(1) NOT NULL,
  PRIMARY KEY (`id_master_comp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `office` (
  `id_office` int(11) NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `office_code` varchar(50) DEFAULT NULL,
  `office_name` varchar(255) NOT NULL,
  `office_description` longtext DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country_code` char(2) NOT NULL DEFAULT 'ID',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `attendance_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `attendance_radius_meter` int(10) unsigned DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `public_slug` varchar(255) DEFAULT NULL,
  `public_sort_order` int(11) NOT NULL DEFAULT 0,
  `google_place_id` varchar(255) DEFAULT NULL,
  `google_maps_url` text DEFAULT NULL,
  `google_business_url` text DEFAULT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  `status` int(11) NOT NULL,
  PRIMARY KEY (`id_office`),
  KEY `idx_office_company_status` (`id_master_comp`,`status`),
  KEY `idx_office_company_public` (`id_master_comp`,`is_public`,`status`),
  KEY `idx_office_public_slug` (`public_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `office_operating_hour` (
  `id_office_operating_hour` int(11) NOT NULL AUTO_INCREMENT,
  `id_office` int(11) NOT NULL,
  `day_of_week` tinyint(3) unsigned NOT NULL,
  `sequence` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `open_time` time DEFAULT NULL,
  `close_time` time DEFAULT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_office_operating_hour`),
  UNIQUE KEY `unique_office_day_sequence` (`id_office`,`day_of_week`,`sequence`),
  KEY `idx_office_operating_hour_office` (`id_office`),
  CONSTRAINT `fk_office_operating_hour_office` FOREIGN KEY (`id_office`) REFERENCES `office` (`id_office`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chair` (
  `id_chair` int(11) NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `chair_name` varchar(255) NOT NULL,
  `chair_description` longtext DEFAULT NULL,
  `chair_status` int(11) NOT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_chair`),
  KEY `idx_chair_company_status_name` (`id_master_comp`,`chair_status`,`chair_name`),
  CONSTRAINT `fk_chair_master_comp` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_access` (
  `id_admin_access` int(11) NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `access_name` varchar(255) NOT NULL,
  `access_description` varchar(500) DEFAULT NULL,
  `access_var` longtext DEFAULT NULL,
  `admin_access_status` int(11) NOT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_admin_access`),
  KEY `idx_admin_access_company_status` (`id_master_comp`,`admin_access_status`),
  KEY `idx_admin_access_name` (`access_name`),
  CONSTRAINT `fk_admin_access_master_comp` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_permission` (
  `id_admin_permission` int(11) NOT NULL AUTO_INCREMENT,
  `permission_key` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `permission_group` varchar(100) DEFAULT NULL,
  `permission_description` varchar(255) DEFAULT NULL,
  `permission_status` tinyint(4) NOT NULL DEFAULT 1,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_admin_permission`),
  UNIQUE KEY `permission_key` (`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_access_permission` (
  `id_admin_access_permission` int(11) NOT NULL AUTO_INCREMENT,
  `id_admin_access` int(11) NOT NULL,
  `id_admin_permission` int(11) NOT NULL,
  PRIMARY KEY (`id_admin_access_permission`),
  UNIQUE KEY `unique_access_permission` (`id_admin_access`,`id_admin_permission`),
  KEY `fk_access_permission_permission` (`id_admin_permission`),
  CONSTRAINT `fk_access_permission_access` FOREIGN KEY (`id_admin_access`) REFERENCES `admin_access` (`id_admin_access`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_permission_permission` FOREIGN KEY (`id_admin_permission`) REFERENCES `admin_permission` (`id_admin_permission`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attachment` (
  `id_attachment` int(11) NOT NULL AUTO_INCREMENT,
  `collection_name` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `extension` varchar(20) NOT NULL,
  `disk` varchar(50) NOT NULL DEFAULT 'local',
  `storage_path` varchar(500) NOT NULL,
  `file_size` bigint(20) unsigned NOT NULL,
  `width` int(10) unsigned DEFAULT NULL,
  `height` int(10) unsigned DEFAULT NULL,
  `id_master_comp` int(11) DEFAULT NULL,
  `id_office` int(11) DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `attachment_status` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_attachment`),
  UNIQUE KEY `uq_attachment_storage_path` (`storage_path`),
  KEY `idx_attachment_collection_status` (`collection_name`,`attachment_status`),
  KEY `idx_attachment_created_by` (`created_by_id`),
  KEY `idx_attachment_master_comp` (`id_master_comp`),
  KEY `idx_attachment_office` (`id_office`),
  CONSTRAINT `fk_attachment_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `admin_acct` (`id_admin_acct`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attachment_master_comp` FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attachment_office` FOREIGN KEY (`id_office`) REFERENCES `office` (`id_office`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_acct` (
  `id_admin_acct` int(11) NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `id_office` int(11) NOT NULL,
  `password` longtext NOT NULL,
  `name` varchar(255) NOT NULL,
  `alias` varchar(255) NOT NULL,
  `email_1` varchar(255) NOT NULL,
  `email_2` varchar(255) DEFAULT NULL,
  `phone_1` varchar(255) NOT NULL,
  `phone_2` varchar(255) DEFAULT NULL,
  `id_profile_photo` int(11) DEFAULT NULL,
  `uuid` int(11) NOT NULL,
  `id_chair` int(11) NOT NULL,
  `id_access` int(11) NOT NULL,
  `is_all_access` tinyint(1) NOT NULL,
  `fcm` text DEFAULT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  `admin_acct_status` int(11) NOT NULL,
  PRIMARY KEY (`id_admin_acct`),
  UNIQUE KEY `uq_admin_acct_alias` (`alias`),
  KEY `idx_admin_acct_profile_photo` (`id_profile_photo`),
  CONSTRAINT `fk_admin_acct_profile_photo` FOREIGN KEY (`id_profile_photo`) REFERENCES `attachment` (`id_attachment`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id_audit_log` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_master_comp` bigint(20) unsigned DEFAULT NULL,
  `request_id` varchar(64) NOT NULL,
  `correlation_id` varchar(64) DEFAULT NULL,
  `event_code` varchar(120) NOT NULL,
  `category` varchar(50) NOT NULL,
  `module` varchar(80) NOT NULL,
  `action` varchar(80) NOT NULL,
  `actor_type` varchar(30) NOT NULL,
  `actor_id` varchar(191) DEFAULT NULL,
  `actor_label` varchar(255) DEFAULT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` varchar(191) DEFAULT NULL,
  `entity_label` varchar(255) DEFAULT NULL,
  `source` varchar(50) NOT NULL DEFAULT 'admin_web',
  `outcome` varchar(30) NOT NULL DEFAULT 'success',
  `http_method` varchar(10) DEFAULT NULL,
  `route_path` varchar(255) DEFAULT NULL,
  `http_status` smallint(5) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_data`)),
  `changed_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changed_fields`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `duration_ms` int(10) unsigned DEFAULT NULL,
  `integrity_version` smallint(5) unsigned NOT NULL DEFAULT 1,
  `integrity_hash` char(64) DEFAULT NULL,
  `created` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id_audit_log`),
  KEY `idx_audit_company_created` (`id_master_comp`,`created`),
  KEY `idx_audit_event` (`event_code`,`created`),
  KEY `idx_audit_actor` (`actor_type`,`actor_id`,`created`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`,`created`),
  KEY `idx_audit_module_action` (`module`,`action`,`created`),
  KEY `idx_audit_request` (`request_id`),
  KEY `idx_audit_correlation` (`correlation_id`),
  KEY `idx_audit_category` (`category`,`created`),
  KEY `idx_audit_outcome` (`outcome`,`created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `office_attachment` (
  `id_office_attachment` int(11) NOT NULL AUTO_INCREMENT,
  `id_office` int(11) NOT NULL,
  `id_attachment` int(11) NOT NULL,
  `attachment_role` varchar(50) NOT NULL DEFAULT 'gallery',
  `caption` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_office_attachment`),
  UNIQUE KEY `unique_office_attachment` (`id_office`,`id_attachment`),
  KEY `idx_office_attachment_office` (`id_office`),
  KEY `idx_office_attachment_attachment` (`id_attachment`),
  CONSTRAINT `fk_office_attachment_attachment` FOREIGN KEY (`id_attachment`) REFERENCES `attachment` (`id_attachment`) ON UPDATE CASCADE,
  CONSTRAINT `fk_office_attachment_office` FOREIGN KEY (`id_office`) REFERENCES `office` (`id_office`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
