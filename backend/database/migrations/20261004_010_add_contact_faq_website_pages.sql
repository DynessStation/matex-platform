-- Add presentation metadata for the existing Contact and FAQ modules.
-- Operational contact data and FAQ entries remain in their dedicated tables.

INSERT INTO `website_page`
(
  `id_master_comp`,
  `website_page_key`,
  `website_page_default_locale`,
  `website_page_is_published`
)
SELECT
  company.`id_master_comp`,
  fixed_page.`page_key`,
  'id-ID',
  1
FROM `master_comp` company
CROSS JOIN (
  SELECT 'contact' AS `page_key`
  UNION ALL
  SELECT 'faq' AS `page_key`
) fixed_page
WHERE NOT EXISTS (
  SELECT 1
  FROM `website_page` existing
  WHERE existing.`id_master_comp` = company.`id_master_comp`
    AND existing.`website_page_key` = fixed_page.`page_key`
);


INSERT INTO `website_page_i18n`
(
  `id_website_page`,
  `id_master_comp`,
  `website_page_locale`,
  `website_page_path`,
  `website_page_title`,
  `website_page_summary`,
  `website_page_seo_title`,
  `website_page_seo_robots`,
  `website_page_social_title`,
  `website_page_translation_is_published`
)
SELECT
  page.`id_website_page`,
  page.`id_master_comp`,
  locale_data.`locale`,
  CASE
    WHEN page.`website_page_key` = 'contact' AND locale_data.`locale` = 'id-ID'
      THEN 'kontak'
    WHEN page.`website_page_key` = 'contact'
      THEN 'contact-us'
    ELSE 'faq'
  END,
  CASE
    WHEN page.`website_page_key` = 'contact' AND locale_data.`locale` = 'id-ID'
      THEN 'Hubungi Kami'
    WHEN page.`website_page_key` = 'contact'
      THEN 'Contact Us'
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'Pertanyaan Umum'
    ELSE 'Frequently Asked Questions'
  END,
  CASE
    WHEN page.`website_page_key` = 'contact' AND locale_data.`locale` = 'id-ID'
      THEN 'Hubungi tim MATEX melalui kanal yang tersedia.'
    WHEN page.`website_page_key` = 'contact'
      THEN 'Contact the MATEX team through the available channels.'
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'Temukan jawaban seputar perusahaan, produk, dan layanan MATEX.'
    ELSE 'Find answers about MATEX, its products, and services.'
  END,
  CASE
    WHEN page.`website_page_key` = 'contact' AND locale_data.`locale` = 'id-ID'
      THEN 'Hubungi MATEX'
    WHEN page.`website_page_key` = 'contact'
      THEN 'Contact MATEX'
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'FAQ MATEX'
    ELSE 'MATEX FAQ'
  END,
  'index, follow',
  CASE
    WHEN page.`website_page_key` = 'contact' AND locale_data.`locale` = 'id-ID'
      THEN 'Hubungi MATEX'
    WHEN page.`website_page_key` = 'contact'
      THEN 'Contact MATEX'
    WHEN locale_data.`locale` = 'id-ID'
      THEN 'FAQ MATEX'
    ELSE 'MATEX FAQ'
  END,
  1
FROM `website_page` page
CROSS JOIN (
  SELECT 'id-ID' AS `locale`
  UNION ALL
  SELECT 'en-US' AS `locale`
) locale_data
WHERE page.`website_page_key` IN ('contact', 'faq')
  AND NOT EXISTS (
    SELECT 1
    FROM `website_page_i18n` existing
    WHERE existing.`id_website_page` = page.`id_website_page`
      AND existing.`website_page_locale` = locale_data.`locale`
  );
