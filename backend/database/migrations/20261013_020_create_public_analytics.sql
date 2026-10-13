START TRANSACTION;

CREATE TABLE IF NOT EXISTS `public_analytics_event` (
  `id_public_analytics_event` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `event_id` char(36) NOT NULL,
  `session_hash` char(64) NOT NULL,
  `event_name` varchar(40) NOT NULL,
  `path` varchar(1000) NOT NULL,
  `locale` varchar(10) NOT NULL,
  `referrer_host` varchar(255) DEFAULT NULL,
  `utm_source` varchar(120) DEFAULT NULL,
  `utm_medium` varchar(120) DEFAULT NULL,
  `utm_campaign` varchar(160) DEFAULT NULL,
  `target_key` varchar(120) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL,
  `received_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id_public_analytics_event`),
  UNIQUE KEY `uq_public_analytics_event_company_event` (`id_master_comp`, `event_id`),
  KEY `idx_public_analytics_event_company_received` (`id_master_comp`, `received_at`),
  KEY `idx_public_analytics_event_company_name_received` (`id_master_comp`, `event_name`, `received_at`),
  KEY `idx_public_analytics_event_company_session_received` (`id_master_comp`, `session_hash`, `received_at`),
  KEY `idx_public_analytics_event_company_path_received` (`id_master_comp`, `path`(191), `received_at`),
  CONSTRAINT `fk_public_analytics_event_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`)
    ON UPDATE CASCADE,
  CONSTRAINT `chk_public_analytics_event_name`
    CHECK (`event_name` IN ('page_view', 'outbound_click', 'contact_start', 'contact_submit')),
  CONSTRAINT `chk_public_analytics_event_locale`
    CHECK (`locale` IN ('id-ID', 'en-US'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
