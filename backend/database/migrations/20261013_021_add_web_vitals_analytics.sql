START TRANSACTION;

ALTER TABLE `public_analytics_event`
  ADD COLUMN IF NOT EXISTS `numeric_value` decimal(12,3) DEFAULT NULL
  AFTER `target_key`;

ALTER TABLE `public_analytics_event`
  DROP CONSTRAINT IF EXISTS `chk_public_analytics_event_name`;

ALTER TABLE `public_analytics_event`
  ADD CONSTRAINT `chk_public_analytics_event_name`
    CHECK (`event_name` IN (
      'page_view',
      'outbound_click',
      'contact_start',
      'contact_submit',
      'web_vital'
    ));

COMMIT;
