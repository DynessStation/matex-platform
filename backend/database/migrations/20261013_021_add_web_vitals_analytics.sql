START TRANSACTION;

ALTER TABLE `public_analytics_event`
  ADD COLUMN `numeric_value` decimal(12,3) DEFAULT NULL
    AFTER `target_key`,
  DROP CONSTRAINT `chk_public_analytics_event_name`,
  ADD CONSTRAINT `chk_public_analytics_event_name`
    CHECK (`event_name` IN (
      'page_view',
      'outbound_click',
      'contact_start',
      'contact_submit',
      'web_vital'
    ));

COMMIT;
