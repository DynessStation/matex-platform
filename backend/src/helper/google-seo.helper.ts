import { JWT } from 'google-auth-library';

const searchConsoleScope = 'https://www.googleapis.com/auth/webmasters.readonly';
const allowedPageSpeedStrategies = new Set(['mobile', 'desktop']);
const safePublicPathPattern = /^\/[a-zA-Z0-9/_-]*$/;

export interface GoogleSeoConfiguration {
  searchConsole: {
    configured: boolean;
    siteUrl: string | null;
    serviceAccountEmail: string | null;
    privateKey: string | null;
  };
  pageSpeed: {
    configured: boolean;
    apiKey: string | null;
    siteUrl: string | null;
  };
}

export interface SearchConsoleRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export const googleSeoConfiguration = (
  env: NodeJS.ProcessEnv = process.env,
): GoogleSeoConfiguration => {
  const siteUrl = env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || null;
  const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || null;
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').trim() || null;
  const pageSpeedKey = env.GOOGLE_PAGESPEED_API_KEY?.trim() || null;
  const publicSiteUrl = env.PUBLIC_SITE_URL?.trim() || null;

  return {
    searchConsole: {
      configured: Boolean(siteUrl && serviceAccountEmail && privateKey),
      siteUrl,
      serviceAccountEmail,
      privateKey,
    },
    pageSpeed: {
      configured: Boolean(pageSpeedKey && publicSiteUrl),
      apiKey: pageSpeedKey,
      siteUrl: publicSiteUrl,
    },
  };
};

export const searchConsoleDateRange = (
  daysValue: unknown,
  now = new Date(),
): { days: number; startDate: string; endDate: string } | null => {
  const days = Number(daysValue ?? 28);
  if (![7, 28, 90].includes(days)) return null;

  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    days,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

export const pageSpeedTarget = (
  siteUrl: string,
  pathValue: unknown,
  strategyValue: unknown,
): { url: string; strategy: 'mobile' | 'desktop' } | null => {
  const path = String(pathValue ?? '/').trim() || '/';
  const strategy = String(strategyValue ?? 'mobile').toLowerCase();
  if (!safePublicPathPattern.test(path) || !allowedPageSpeedStrategies.has(strategy)) {
    return null;
  }

  try {
    const base = new URL(siteUrl);
    const target = new URL(path, base);
    if (target.origin !== base.origin) return null;
    return {
      url: target.toString(),
      strategy: strategy as 'mobile' | 'desktop',
    };
  } catch {
    return null;
  }
};

export const searchConsoleClient = (configuration: GoogleSeoConfiguration) => {
  const settings = configuration.searchConsole;
  if (!settings.configured || !settings.serviceAccountEmail || !settings.privateKey) {
    return null;
  }

  return new JWT({
    email: settings.serviceAccountEmail,
    key: settings.privateKey,
    scopes: [searchConsoleScope],
  });
};

export const searchConsoleTotals = (rows: SearchConsoleRow[]) => {
  const clicks = rows.reduce((total, row) => total + Number(row.clicks ?? 0), 0);
  const impressions = rows.reduce((total, row) => total + Number(row.impressions ?? 0), 0);
  const weightedPosition = rows.reduce(
    (total, row) => total + Number(row.position ?? 0) * Number(row.impressions ?? 0),
    0,
  );

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weightedPosition / impressions : 0,
  };
};
