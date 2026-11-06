START TRANSACTION;

-- V1.2 Part 1, articles. The tag tables exist since migration 004; this adds what they need:
-- - the writer's name as shown to readers (a pen name is fine: id_author stays who wrote it);
--   empty on older articles, which keep showing MATEX;
-- - moved tag addresses in slug_redirect;
-- - a share event for the articles' share buttons.
ALTER TABLE `article`
  ADD COLUMN `article_author_name` varchar(120) DEFAULT NULL AFTER `id_author`;

ALTER TABLE `slug_redirect`
  DROP CONSTRAINT `chk_slug_redirect_entity`,
  ADD CONSTRAINT `chk_slug_redirect_entity`
    CHECK (`slug_redirect_entity` IN ('article', 'product', 'product_category', 'article_tag'));

ALTER TABLE `public_analytics_event`
  DROP CONSTRAINT `chk_public_analytics_event_name`,
  ADD CONSTRAINT `chk_public_analytics_event_name`
    CHECK (`event_name` IN (
      'page_view',
      'outbound_click',
      'contact_start',
      'contact_submit',
      'web_vital',
      'article_share'
    ));

COMMIT;
