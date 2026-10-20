import { Component, inject, viewChild } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { MediaSelection } from '../../../../shared/components/ui/media-box/media-box';
import { MediaModal } from '../../../../shared/components/ui/modal/media-modal/media-modal';
import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
  getGadgetHomeMediaRule,
} from '../../../../shared/data/gadget-home-media';
import { IAttachment } from '../../../../shared/interface/attachment.interface';
import { WebsitePageEditorService } from '../website-page-editor.service';
import {
  GADGET_HOME_MEDIA_ROLES,
  WebsitePageEditorLocale,
  WebsitePageEditorMediaDraft,
  WebsitePageEditorMediaTranslationDraft,
} from '../website-page-form.model';
import {
  createMediaDraft,
  gadgetHomeAttachmentIssue,
  gadgetHomeMediaActionIssue,
  gadgetHomeMediaIssue,
  gadgetHomeMediaRequirement,
  sortGadgetHomeMedia,
  toAttachmentArray,
} from '../website-page-form.util';

// Media tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-media-tab',

  imports: [TranslateModule, MediaModal],

  templateUrl: './website-page-media-tab.html',
})
export class WebsitePageMediaTab {
  readonly editor = inject(WebsitePageEditorService);

  private readonly mediaModal = viewChild<MediaModal>('mediaModal');

  public activeHomeMediaRole: string | null = null;

  public readonly gadgetHomeMediaRules = GADGET_HOME_MEDIA_RULES;

  public readonly gadgetHomeMediaRoles = GADGET_HOME_MEDIA_ROLES;

  // Pure helpers the template calls.
  readonly gadgetHomeMediaRequirement = gadgetHomeMediaRequirement;

  readonly gadgetHomeMediaIssue = gadgetHomeMediaIssue;

  readonly gadgetHomeMediaActionIssue = gadgetHomeMediaActionIssue;

  readonly gadgetHomeMediaRule = getGadgetHomeMediaRule;

  get isMetadataOnlyFixedPage(): boolean {
    return (
      this.editor.isSystemPage &&
      ['contact', 'faq', 'terms', 'career'].includes(
        this.editor.form.controls.website_page_key.value,
      )
    );
  }

  get mediaRoleOptions(): { value: string; label: string }[] {
    if (this.editor.isGadgetHomeTemplate) return this.gadgetHomeMediaRoles;

    if (this.editor.isAboutTemplate) {
      return [
        { value: 'about_content', label: 'Gambar konten Tentang MATEX' },
        { value: 'og', label: 'Open Graph / share image' },
      ];
    }

    if (this.isMetadataOnlyFixedPage) {
      return [{ value: 'og', label: 'Open Graph / share image' }];
    }

    return [
      { value: 'hero', label: 'Hero image' },
      { value: 'gallery', label: 'Gallery' },
      { value: 'og', label: 'Open Graph / share image' },
    ];
  }

  goToPublication(): void {
    this.editor.activeTab = 'publication';
  }

  openMedia(): void {
    this.activeHomeMediaRole = null;
    void this.mediaModal()?.openModal();
  }

  openHomeMedia(rule: GadgetHomeMediaRule): void {
    this.activeHomeMediaRole = rule.value;
    const current = this.gadgetHomeMediaForRole(rule.value);
    const disabledSelectionIds = this.editor.pageMedia
      .filter((media) => media.role !== rule.value)
      .map((media) => media.attachment.id_attachment);

    void this.mediaModal()?.openModal({
      selection: current?.attachment ?? null,
      title: `Pilih gambar · ${rule.label}`,
      description: gadgetHomeMediaRequirement(rule),
      multiple: false,
      maxSelection: 1,
      disabledSelectionIds,
      validateSelection: (attachment) =>
        gadgetHomeAttachmentIssue(attachment, rule),
    });
  }

  openHomeOgMedia(): void {
    const role = 'og';
    this.activeHomeMediaRole = role;
    const current = this.gadgetHomeMediaForRole(role);
    const disabledSelectionIds = this.editor.pageMedia
      .filter((media) => media.role !== role)
      .map((media) => media.attachment.id_attachment);

    void this.mediaModal()?.openModal({
      selection: current?.attachment ?? null,
      title: this.editor.translate.instant('website_page.home_media_og_title'),
      description: this.editor.translate.instant(
        'website_page.home_media_og_requirement',
      ),
      multiple: false,
      maxSelection: 1,
      disabledSelectionIds,
      validateSelection: (attachment) =>
        this.editor.pageMediaAccept.includes(attachment.mime_type)
          ? null
          : this.editor.translate.instant(
              'website_page.home_media_format_error',
            ),
    });
  }

  get selectedMedia(): IAttachment[] {
    if (this.editor.isGadgetHomeTemplate && this.activeHomeMediaRole) {
      const current = this.gadgetHomeMediaForRole(this.activeHomeMediaRole);
      return current ? [current.attachment] : [];
    }

    return this.editor.pageMedia.map((item) => item.attachment);
  }

  selectMedia(selection: MediaSelection): void {
    if (this.editor.isGadgetHomeTemplate && this.activeHomeMediaRole) {
      const [attachment] = toAttachmentArray(selection);
      if (!attachment) return;

      const role = this.activeHomeMediaRole;
      const currentIndex = this.editor.pageMedia.findIndex(
        (media) => media.role === role,
      );

      if (currentIndex >= 0) {
        this.editor.pageMedia[currentIndex] = {
          ...this.editor.pageMedia[currentIndex],
          attachment,
        };
      } else {
        this.editor.pageMedia.push(createMediaDraft(attachment, role));
      }

      this.editor.pageMedia = sortGadgetHomeMedia(this.editor.pageMedia);
      this.activeHomeMediaRole = null;
      return;
    }

    const selected = this.editor.isGadgetHomeTemplate
      ? toAttachmentArray(selection).slice(0, this.gadgetHomeMediaRoles.length)
      : toAttachmentArray(selection);

    const oldMap = new Map(
      this.editor.pageMedia.map((item) => [
        item.attachment.id_attachment,
        item,
      ]),
    );

    const assignedRoles = new Set(
      selected
        .map((attachment) => oldMap.get(attachment.id_attachment)?.role)
        .filter((role): role is string => Boolean(role)),
    );

    this.editor.pageMedia = selected.map((attachment) => {
      const existing = oldMap.get(attachment.id_attachment);

      if (existing) {
        return existing;
      }

      const role = this.editor.isGadgetHomeTemplate
        ? (this.gadgetHomeMediaRoles.find(
            (option) => !assignedRoles.has(option.value),
          )?.value ?? this.gadgetHomeMediaRoles[0].value)
        : this.editor.isAboutTemplate
          ? assignedRoles.has('about_content')
            ? 'og'
            : 'about_content'
          : this.isMetadataOnlyFixedPage
            ? 'og'
            : assignedRoles.has('hero')
              ? 'gallery'
              : 'hero';

      assignedRoles.add(role);

      return createMediaDraft(attachment, role);
    });
  }

  setHero(index: number): void {
    this.editor.pageMedia = this.editor.pageMedia.map((item, currentIndex) => ({
      ...item,

      role: currentIndex === index ? 'hero' : 'gallery',
    }));
  }

  updateMediaRole(index: number, role: string): void {
    if (this.editor.isGadgetHomeTemplate) {
      if (!this.gadgetHomeMediaRoles.some((option) => option.value === role)) {
        return;
      }

      const previousRole = this.editor.pageMedia[index]?.role;

      this.editor.pageMedia = this.editor.pageMedia.map(
        (item, currentIndex) => {
          if (currentIndex === index) return { ...item, role };
          if (item.role === role && previousRole) {
            return { ...item, role: previousRole };
          }
          return item;
        },
      );

      return;
    }

    const uniqueRole = role !== 'gallery';

    this.editor.pageMedia = this.editor.pageMedia.map((item, currentIndex) => {
      if (currentIndex === index) return { ...item, role };
      if (uniqueRole && item.role === role) return { ...item, role: 'gallery' };
      return item;
    });
  }

  updateMediaActionType(
    index: number,
    actionType: 'none' | 'internal' | 'external' | 'product' | 'category',
  ): void {
    this.editor.pageMedia[index] = {
      ...this.editor.pageMedia[index],
      action_type: actionType,
      action_value:
        actionType === 'none' ? '' : this.editor.pageMedia[index].action_value,
    };
    this.editor.pageMedia = [...this.editor.pageMedia];
  }

  updateMediaActionValue(index: number, actionValue: string): void {
    this.editor.pageMedia[index] = {
      ...this.editor.pageMedia[index],
      action_value: actionValue,
    };
    this.editor.pageMedia = [...this.editor.pageMedia];
  }

  mediaRoleLabel(role: string): string {
    return (
      this.mediaRoleOptions.find((option) => option.value === role)?.label ??
      role
    );
  }

  gadgetHomeMediaAssigned(role: string): boolean {
    return this.editor.pageMedia.some(
      (media) => media.is_public && media.role === role,
    );
  }

  gadgetHomeMediaForRole(role: string): WebsitePageEditorMediaDraft | null {
    return this.editor.pageMedia.find((media) => media.role === role) ?? null;
  }

  removeMedia(index: number): void {
    const wasHero = this.editor.pageMedia[index]?.role === 'hero';

    this.editor.pageMedia.splice(index, 1);

    this.editor.pageMedia = [...this.editor.pageMedia];

    if (
      wasHero &&
      this.editor.pageMedia.length &&
      !this.editor.isGadgetHomeTemplate
    ) {
      this.setHero(0);
    }
  }

  moveMedia(index: number, direction: -1 | 1): void {
    const target = index + direction;

    if (target < 0 || target >= this.editor.pageMedia.length) {
      return;
    }

    const next = [...this.editor.pageMedia];

    [next[index], next[target]] = [next[target], next[index]];

    this.editor.pageMedia = next;
  }

  updateMediaPublic(index: number, checked: boolean): void {
    this.editor.pageMedia[index] = {
      ...this.editor.pageMedia[index],

      is_public: checked,
    };

    this.editor.pageMedia = [...this.editor.pageMedia];
  }

  updateMediaTranslation(
    index: number,
    locale: WebsitePageEditorLocale,
    field: keyof WebsitePageEditorMediaTranslationDraft,
    value: string,
  ): void {
    const item = this.editor.pageMedia[index];

    this.editor.pageMedia[index] = {
      ...item,

      translations: {
        ...item.translations,

        [locale]: {
          ...item.translations[locale],

          [field]: value,
        },
      },
    };

    this.editor.pageMedia = [...this.editor.pageMedia];
  }
}
