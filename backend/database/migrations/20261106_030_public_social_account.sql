START TRANSACTION;

-- V1.2 Part 1, contact settings. Social media accounts get their own list: several per platform,
-- an active state apart from being shown on the website, and hand-kept follower numbers (the
-- platforms' own APIs need an app review). Channels of type "social" move there.
CREATE TABLE IF NOT EXISTS `public_social_account` (
  `id_public_social_account` int NOT NULL AUTO_INCREMENT,
  `id_master_comp` int(11) NOT NULL,
  `public_social_account_key` varchar(100) NOT NULL,
  `public_social_account_platform` varchar(20) NOT NULL,
  `public_social_account_name` varchar(150) NOT NULL,
  `public_social_account_url` varchar(1000) NOT NULL,
  `public_social_account_is_active` tinyint(1) NOT NULL DEFAULT 1,
  `public_social_account_is_public` tinyint(1) NOT NULL DEFAULT 1,
  `public_social_account_sort_order` int NOT NULL DEFAULT 0,
  `public_social_account_followers` int DEFAULT NULL,
  `public_social_account_content_count` int DEFAULT NULL,
  `public_social_account_stats_updated_at` datetime DEFAULT NULL,
  `id_created_by` int DEFAULT NULL,
  `id_updated_by` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `public_social_account_deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_public_social_account`),
  UNIQUE KEY `uq_public_social_account_key` (`id_master_comp`, `public_social_account_key`),
  KEY `idx_public_social_account_public` (`id_master_comp`, `public_social_account_is_public`, `public_social_account_sort_order`),
  CONSTRAINT `fk_public_social_account_company`
    FOREIGN KEY (`id_master_comp`) REFERENCES `master_comp` (`id_master_comp`) ON UPDATE CASCADE,
  CONSTRAINT `chk_public_social_account_platform`
    CHECK (`public_social_account_platform` IN ('facebook', 'instagram', 'tiktok', 'youtube', 'linkedin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `public_social_account`
  (`id_master_comp`, `public_social_account_key`, `public_social_account_platform`,
   `public_social_account_name`, `public_social_account_url`, `public_social_account_is_active`,
   `public_social_account_is_public`, `public_social_account_sort_order`)
SELECT c.`id_master_comp`, c.`public_contact_channel_key`,
  CASE
    WHEN c.`public_contact_channel_url` LIKE '%facebook.%' THEN 'facebook'
    WHEN c.`public_contact_channel_url` LIKE '%instagram.%' THEN 'instagram'
    WHEN c.`public_contact_channel_url` LIKE '%tiktok.%' THEN 'tiktok'
    WHEN c.`public_contact_channel_url` LIKE '%youtube.%' THEN 'youtube'
    WHEN c.`public_contact_channel_url` LIKE '%linkedin.%' THEN 'linkedin'
  END,
  LEFT(c.`public_contact_channel_value`, 150), c.`public_contact_channel_url`,
  1, c.`public_contact_channel_is_public`, c.`public_contact_channel_sort_order`
FROM `public_contact_channel` c
WHERE c.`public_contact_channel_type` = 'social'
  AND c.`public_contact_channel_deleted_at` IS NULL
  AND c.`public_contact_channel_url` REGEXP 'facebook\\.|instagram\\.|tiktok\\.|youtube\\.|linkedin\\.';

UPDATE `public_contact_channel` c
INNER JOIN `public_social_account` s
  ON s.`id_master_comp` = c.`id_master_comp`
  AND s.`public_social_account_key` = c.`public_contact_channel_key`
SET c.`public_contact_channel_deleted_at` = NOW(), c.`public_contact_channel_is_public` = 0
WHERE c.`public_contact_channel_type` = 'social'
  AND c.`public_contact_channel_deleted_at` IS NULL;

-- A topic deleted from the list stays for the messages that point at it.
ALTER TABLE `contact_inquiry_topic`
  ADD COLUMN `contact_inquiry_topic_deleted_at` datetime DEFAULT NULL;

COMMIT;
