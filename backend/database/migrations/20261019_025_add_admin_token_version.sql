START TRANSACTION;

-- Session revocation (audit SEC-003): every access token carries the account's token_version.
-- Logout increments it, so all tokens issued before (including copied ones) stop working.
ALTER TABLE `admin_acct`
  ADD COLUMN `token_version` int(11) NOT NULL DEFAULT 0
    AFTER `fcm`;

COMMIT;
