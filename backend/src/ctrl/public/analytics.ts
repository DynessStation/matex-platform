import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';

import { pool } from '../../db';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import {
  isLikelyBot,
  normalizePublicAnalyticsInput,
  trustedCountryCode,
} from '../../helper/public-analytics.helper';

const router = Router();

router.get('/api/public/analytics/config', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  return sendSuccess(res, 200, 'ANALYTICS_CONFIG_FOUND', 'Analytics config loaded', {
    enabled: process.env.PUBLIC_ANALYTICS_ENABLED === 'true',
  });
});

router.post('/api/public/analytics/event', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (process.env.PUBLIC_ANALYTICS_ENABLED !== 'true') {
    return sendSuccess(res, 202, 'ANALYTICS_DISABLED', 'Analytics is disabled', null);
  }

  const company = Number(process.env.PUBLIC_COMPANY_ID);
  const hashSecret = process.env.ANALYTICS_HASH_SECRET ?? '';
  if (!Number.isSafeInteger(company) || company <= 0 || hashSecret.length < 32) {
    return sendError(res, 503, 'ANALYTICS_UNAVAILABLE', 'Analytics is not configured');
  }

  if (isLikelyBot(req.get('user-agent'))) {
    return sendSuccess(res, 202, 'ANALYTICS_IGNORED', 'Event ignored', null);
  }

  const event = normalizePublicAnalyticsInput(req.body, hashSecret);
  if (!event) {
    return sendError(res, 400, 'ANALYTICS_EVENT_INVALID', 'Invalid analytics event');
  }

  const countryHeader = (process.env.ANALYTICS_COUNTRY_HEADER || 'cf-ipcountry').toLowerCase();
  const countryCode = trustedCountryCode(
    req.get(countryHeader),
    process.env.ANALYTICS_TRUST_COUNTRY_HEADER === 'true',
  );

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO public_analytics_event
        (id_master_comp, event_id, session_hash, event_name, path, locale,
         referrer_host, utm_source, utm_medium, utm_campaign, target_key,
         numeric_value, country_code, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company,
        event.eventId,
        event.sessionHash,
        event.eventName,
        event.path,
        event.locale,
        event.referrerHost,
        event.utmSource,
        event.utmMedium,
        event.utmCampaign,
        event.targetKey,
        event.numericValue,
        countryCode,
        event.occurredAt,
      ],
    );

    return sendSuccess(res, 202, 'ANALYTICS_EVENT_ACCEPTED', 'Event accepted', {
      stored: result.affectedRows === 1,
    });
  } catch (error) {
    console.error('[Public Analytics] Event ingestion failed', error);
    return sendError(res, 503, 'ANALYTICS_UNAVAILABLE', 'Analytics is unavailable');
  }
});

export default router;
