START TRANSACTION;

ALTER TABLE `contact_inquiry`
  ADD COLUMN `contact_inquiry_recipient_email` varchar(255) DEFAULT NULL AFTER `contact_inquiry_consent_at`,
  ADD COLUMN `contact_inquiry_notification_status` varchar(20) NOT NULL DEFAULT 'pending' AFTER `contact_inquiry_recipient_email`,
  ADD COLUMN `contact_inquiry_notification_sent_at` datetime DEFAULT NULL AFTER `contact_inquiry_notification_status`,
  ADD COLUMN `contact_inquiry_notification_error` varchar(1000) DEFAULT NULL AFTER `contact_inquiry_notification_sent_at`,
  ADD CONSTRAINT `chk_contact_inquiry_notification_status`
    CHECK (`contact_inquiry_notification_status` IN ('pending', 'sent', 'skipped', 'failed'));

INSERT INTO `contact_inquiry_topic` (
  `id_master_comp`,
  `contact_inquiry_topic_key`,
  `contact_inquiry_topic_recipient_email`,
  `contact_inquiry_topic_sort_order`,
  `contact_inquiry_topic_status`
)
SELECT `id_master_comp`, 'product-information', 'hardyness.ms9@gmail.com', 0, 1
FROM `master_comp`
WHERE `comp_status` = 1
ON DUPLICATE KEY UPDATE
  `contact_inquiry_topic_recipient_email` = VALUES(`contact_inquiry_topic_recipient_email`),
  `contact_inquiry_topic_sort_order` = VALUES(`contact_inquiry_topic_sort_order`),
  `contact_inquiry_topic_status` = 1;

INSERT INTO `contact_inquiry_topic` (
  `id_master_comp`, `contact_inquiry_topic_key`,
  `contact_inquiry_topic_recipient_email`, `contact_inquiry_topic_sort_order`,
  `contact_inquiry_topic_status`
)
SELECT `id_master_comp`, 'quotation-and-sales', 'hardyness.ms9@gmail.com', 1, 1
FROM `master_comp`
WHERE `comp_status` = 1
ON DUPLICATE KEY UPDATE
  `contact_inquiry_topic_recipient_email` = VALUES(`contact_inquiry_topic_recipient_email`),
  `contact_inquiry_topic_sort_order` = VALUES(`contact_inquiry_topic_sort_order`),
  `contact_inquiry_topic_status` = 1;

INSERT INTO `contact_inquiry_topic` (
  `id_master_comp`, `contact_inquiry_topic_key`,
  `contact_inquiry_topic_recipient_email`, `contact_inquiry_topic_sort_order`,
  `contact_inquiry_topic_status`
)
SELECT `id_master_comp`, 'partnership', 'hardyness.ms9@gmail.com', 2, 1
FROM `master_comp`
WHERE `comp_status` = 1
ON DUPLICATE KEY UPDATE
  `contact_inquiry_topic_recipient_email` = VALUES(`contact_inquiry_topic_recipient_email`),
  `contact_inquiry_topic_sort_order` = VALUES(`contact_inquiry_topic_sort_order`),
  `contact_inquiry_topic_status` = 1;

INSERT INTO `contact_inquiry_topic` (
  `id_master_comp`, `contact_inquiry_topic_key`,
  `contact_inquiry_topic_recipient_email`, `contact_inquiry_topic_sort_order`,
  `contact_inquiry_topic_status`
)
SELECT `id_master_comp`, 'other', 'hardyness.ms9@gmail.com', 3, 1
FROM `master_comp`
WHERE `comp_status` = 1
ON DUPLICATE KEY UPDATE
  `contact_inquiry_topic_recipient_email` = VALUES(`contact_inquiry_topic_recipient_email`),
  `contact_inquiry_topic_sort_order` = VALUES(`contact_inquiry_topic_sort_order`),
  `contact_inquiry_topic_status` = 1;

INSERT INTO `contact_inquiry_topic_i18n` (
  `id_contact_inquiry_topic`, `id_master_comp`,
  `contact_inquiry_topic_locale`, `contact_inquiry_topic_label`,
  `contact_inquiry_topic_i18n_status`
)
SELECT q.`id_contact_inquiry_topic`, q.`id_master_comp`, l.locale, l.label, 1
FROM `contact_inquiry_topic` q
INNER JOIN (
  SELECT 'product-information' topic_key, 'id-ID' locale, 'Informasi Produk' label
  UNION ALL SELECT 'product-information', 'en-US', 'Product Information'
  UNION ALL SELECT 'quotation-and-sales', 'id-ID', 'Penawaran & Pembelian'
  UNION ALL SELECT 'quotation-and-sales', 'en-US', 'Quotation & Sales'
  UNION ALL SELECT 'partnership', 'id-ID', 'Kemitraan & Kerja Sama'
  UNION ALL SELECT 'partnership', 'en-US', 'Partnership & Collaboration'
  UNION ALL SELECT 'other', 'id-ID', 'Lainnya'
  UNION ALL SELECT 'other', 'en-US', 'Other'
) l ON l.topic_key = q.`contact_inquiry_topic_key`
ON DUPLICATE KEY UPDATE
  `contact_inquiry_topic_label` = VALUES(`contact_inquiry_topic_label`),
  `contact_inquiry_topic_i18n_status` = 1;

COMMIT;
