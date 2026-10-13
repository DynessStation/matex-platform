START TRANSACTION;

CREATE TABLE IF NOT EXISTS `comp_category` (
  `id_comp_category` int(11) NOT NULL AUTO_INCREMENT,
  `comp_category_name` varchar(255) NOT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  `comp_category_status` int(11) NOT NULL,
  PRIMARY KEY (`id_comp_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `comp_category` (
  `id_comp_category`,
  `comp_category_name`,
  `created`,
  `updated`,
  `comp_category_status`
) VALUES
  (1, 'Perusahaan Induk', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  (2, 'Produsen Latex Sofa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

COMMIT;
