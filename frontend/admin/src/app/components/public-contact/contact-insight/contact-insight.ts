import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InsightAudit } from '../../../shared/components/ui/insight/insight-audit';
import {
  InsightColumn,
  InsightPanel,
} from '../../../shared/components/ui/insight/insight-panel';
import { InsightRank } from '../../../shared/components/ui/insight/insight-rank';
import {
  InsightCheck,
  InsightRange,
  InsightRankItem,
  InsightSegment,
} from '../../../shared/components/ui/insight/insight.model';
import {
  IContactInsightAudit,
  IContactInsightChannel,
  IContactInsightSocial,
} from '../../../shared/interface/public-contact.interface';
import { PublicContactService } from '../../../shared/services/public-contact.service';

const DAYS: Record<InsightRange, number> = { '1H': 1, '7H': 7, '1B': 30 };
const TOP = 4;

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'ri-facebook-fill',
  instagram: 'ri-instagram-line',
  tiktok: 'ri-tiktok-line',
  youtube: 'ri-youtube-line',
  linkedin: 'ri-linkedin-fill',
};
const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: 'ri-whatsapp-line',
  email: 'ri-mail-line',
  phone: 'ri-phone-line',
  website: 'ri-global-line',
};
// The platforms MATEX means to be on.
const EXPECTED_PLATFORMS = [
  { key: 'facebook', name: 'Facebook' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'tiktok', name: 'TikTok' },
];

// The insight band of the contact settings. `version` changes after a save: the numbers follow.
@Component({
  selector: 'app-contact-insight',
  imports: [
    TranslateModule,
    InsightAudit,
    InsightColumn,
    InsightPanel,
    InsightRank,
  ],
  templateUrl: './contact-insight.html',
})
export class ContactInsight {
  private readonly service = inject(PublicContactService);
  private readonly translate = inject(TranslateService);

  readonly version = input(0);

  readonly socialRange = signal<InsightRange>('1H');
  readonly channelRange = signal<InsightRange>('7H');
  readonly socials = signal<IContactInsightSocial[]>([]);
  readonly channels = signal<IContactInsightChannel[]>([]);
  readonly audit = signal<IContactInsightAudit | null>(null);

  private readonly visits = computed(() =>
    this.translate.instant('public_contact.insight_visits'),
  );

  readonly socialItems = computed<InsightRankItem[]>(() =>
    this.socials()
      .filter((item) => item.is_active === 1)
      .slice(0, TOP)
      .map((item) => ({
        title: item.name,
        sub: this.stats(item),
        value: item.clicks,
        valueLabel: this.visits(),
        icon: PLATFORM_ICONS[item.platform],
        href: item.url,
      })),
  );

  readonly channelItems = computed<InsightRankItem[]>(() =>
    this.channels()
      .slice(0, TOP)
      .map((item) => ({
        title: item.label,
        sub: item.description,
        value: item.clicks,
        valueLabel: this.translate.instant('public_contact.insight_clicks'),
        icon: CHANNEL_ICONS[item.type] ?? 'ri-links-line',
      })),
  );

  /** "Belum ada akun TikTok": a platform with nothing active and shown. */
  readonly missingPlatforms = computed(() =>
    EXPECTED_PLATFORMS.filter(
      (platform) =>
        !this.socials().some(
          (item) => item.platform === platform.key && item.is_public === 1,
        ),
    ),
  );

  readonly segments = computed<InsightSegment[]>(() => {
    const audit = this.audit();
    const name = (key: string) =>
      this.translate.instant(`public_contact.insight_${key}`);
    return [
      { label: name('sent'), value: audit?.sent ?? 0, tone: 'success' },
      { label: name('failed'), value: audit?.failed ?? 0, tone: 'danger' },
      { label: name('other'), value: audit?.other ?? 0, tone: 'muted' },
    ];
  });

  readonly checks = computed<InsightCheck[]>(() => {
    const audit = this.audit();
    if (!audit) return [];
    const text = (key: string, params?: Record<string, number>) =>
      this.translate.instant(`public_contact.insight_${key}`, params);
    return [
      audit.topics_without_recipient === 0
        ? { state: 'ok', text: text('topics_ok') }
        : {
            state: 'warn',
            text: text('topics_missing', {
              count: audit.topics_without_recipient,
            }),
          },
      audit.mail_configured
        ? { state: 'ok', text: text('mail_ok') }
        : { state: 'warn', text: text('mail_missing') },
      audit.failed === 0
        ? { state: 'ok', text: text('no_failed') }
        : { state: 'warn', text: text('has_failed', { count: audit.failed }) },
      { state: 'ok', text: text('today', { count: audit.today }) },
    ];
  });

  constructor() {
    effect(() => {
      this.version();
      this.service
        .insightSocials(DAYS[this.socialRange()])
        .subscribe((response) => this.socials.set(response.data ?? []));
    });
    effect(() => {
      this.version();
      this.service
        .insightChannels(DAYS[this.channelRange()])
        .subscribe((response) => this.channels.set(response.data ?? []));
    });
    effect(() => {
      this.version();
      this.service
        .insightAudit()
        .subscribe((response) => this.audit.set(response.data ?? null));
    });
  }

  private stats(item: IContactInsightSocial): string {
    if (item.followers === null && item.content_count === null) return '';
    return `${item.followers ?? '-'} ${this.translate.instant(
      'public_contact.followers',
    )} | ${item.content_count ?? '-'} ${this.translate.instant(
      'public_contact.content_count',
    )}`;
  }
}
