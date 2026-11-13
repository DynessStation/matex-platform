import {
  Component,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { WebsitePageAssistantService } from './website-page-assistant.service';
import { WebsitePageContentTab } from './website-page-content-tab/website-page-content-tab';
import { WebsitePageEditorService } from './website-page-editor.service';
import { WebsitePageGeneralTab } from './website-page-general-tab/website-page-general-tab';
import { WebsitePageMediaTab } from './website-page-media-tab/website-page-media-tab';
import { WebsitePagePreviewTab } from './website-page-preview-tab/website-page-preview-tab';
import { WebsitePagePublicationTab } from './website-page-publication-tab/website-page-publication-tab';
import { WebsitePagePublicationService } from './website-page-publication.service';
import { WebsitePageSaveService } from './website-page-save.service';
import { WebsitePageSeoTab } from './website-page-seo-tab/website-page-seo-tab';
import {
  EnglishAutofill,
  EnglishPair,
  objectPairs,
  writePath,
} from '../../../shared/components/ui/english/english-autofill';
import { EnglishToggle } from '../../../shared/components/ui/english/english-toggle';
import { FormHeading } from '../../../shared/components/ui/form-kit/form-heading';
import {
  TabState,
  tabState,
} from '../../../shared/components/ui/form-kit/form-kit.util';
import { TabStatus } from '../../../shared/components/ui/form-kit/tab-status';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorSaveRequest,
} from '../../../shared/interface/website-page-editor.interface';
import { EnglishFieldType } from '../../../shared/services/english.service';

@Component({
  selector: 'app-website-page-form',

  imports: [
    ReactiveFormsModule,
    NgbModule,
    TranslateModule,
    FormHeading,
    TabStatus,
    WebsitePageGeneralTab,
    WebsitePageContentTab,
    WebsitePageSeoTab,
    WebsitePageMediaTab,
    WebsitePagePublicationTab,
    WebsitePagePreviewTab,
    EnglishToggle,
  ],

  templateUrl: './website-page-form.html',

  providers: [
    EnglishAutofill,
    WebsitePageEditorService,
    WebsitePagePublicationService,
    WebsitePageSaveService,
    WebsitePageAssistantService,
  ],
})
export class WebsitePageForm {
  readonly editor = inject(WebsitePageEditorService);

  readonly save = inject(WebsitePageSaveService);

  private readonly publication = inject(WebsitePagePublicationService);

  readonly editData = input<IWebsitePageEditorDetail | null>(null);

  readonly saving = input(false);

  readonly submitted = output<IWebsitePageEditorSaveRequest>();

  constructor() {
    this.editor.connect({
      editData: this.editData,
      saving: this.saving,
    });

    this.save.connect({ submitted: this.submitted });
    this.english.configure('website_page', () => this.englishPairs());
    // Each time the page is (re)loaded, after the editor has filled the form from it.
    effect(() => {
      const data = this.editData();
      if (!data) return;
      untracked(() =>
        setTimeout(() => void this.english.remember(data.website_page_key)),
      );
    });
  }

  private readonly english = inject(EnglishAutofill);

  /** The English text of the page, paired with its Indonesian: the translation fields, the
   * content blocks of the home and about pages, the popular tags, and the media texts. Nothing
   * while the page has no English version: that stays the editor's own choice. */
  private englishPairs(): EnglishPair[] {
    const editor = this.editor;
    if (!editor.isLanguageEnabled('en-US')) return [];
    const id = editor.translationForm('id-ID').controls;
    const en = editor.translationForm('en-US').controls;
    const types: Partial<Record<string, EnglishFieldType>> = {
      excerpt: 'multiline_text',
      content: 'rich_text_html',
      meta_description: 'seo_description',
      og_description: 'seo_description',
      meta_keywords: 'keyword_list',
    };
    const keys = [
      'title',
      'slug',
      'excerpt',
      'content',
      'meta_title',
      'meta_description',
      'meta_keywords',
      'og_title',
      'og_description',
    ] as const;
    const pairs: EnglishPair[] = keys.map((key) => ({
      key,
      id: () => String(id[key].value ?? ''),
      en: () => String(en[key].value ?? ''),
      set: (value: string) => en[key].setValue(value),
      type: types[key],
      slugOf: key === 'slug' ? 'title' : undefined,
    }));
    const blocks = (
      prefix: string,
      record: Record<'id-ID' | 'en-US', unknown>,
    ) =>
      objectPairs(
        prefix,
        () => record['id-ID'],
        () => record['en-US'],
        (path, value) => writePath(record['en-US'], path, value),
      );
    if (editor.isGadgetHomeTemplate) {
      pairs.push(
        ...blocks('home', editor.homeLatexContent),
        ...blocks('advertisement', editor.homeAdvertisementContent),
        ...editor.homeTags.map((tag, index) => ({
          key: 'tags.' + index + '.label',
          id: () => tag.label_id ?? '',
          en: () => tag.label_en ?? '',
          set: (value: string) =>
            (tag.label_en = value.slice(0, editor.homeTagLabelMaxLength)),
          type: 'plain_text' as const,
        })),
      );
    }
    if (editor.isAboutTemplate)
      pairs.push(...blocks('about', editor.aboutFeatures));
    editor.pageMedia.forEach((media, index) => {
      for (const field of ['caption', 'alt_text'] as const) {
        pairs.push({
          key: 'media.' + index + '.' + field,
          id: () => media.translations['id-ID']?.[field] ?? '',
          en: () => media.translations['en-US']?.[field] ?? '',
          set: (value: string) => {
            media.translations['en-US'] = {
              ...media.translations['en-US'],
              [field]: value,
            };
          },
          type: 'plain_text',
        });
      }
    });
    return pairs;
  }

  /** The page's name above the tabs, in its default language. */
  get pageTitle(): string {
    const { 'id-ID': id, 'en-US': en } =
      this.editor.form.controls.translations.controls;
    return id.controls.title.value || en.controls.title.value;
  }

  /** The dots on the tabs (G-2). */
  tabStates(): Record<
    'general' | 'content' | 'seo' | 'media' | 'publication',
    TabState
  > {
    const { 'id-ID': id, 'en-US': en } =
      this.editor.form.controls.translations.controls;
    const publication = this.publication;
    return {
      general: 'ok',
      content: tabState({
        required: [id.controls.title, en.controls.title],
      }),
      seo: tabState({
        required: [id.controls.canonical_url, en.controls.canonical_url],
        recommended: [
          id.controls.meta_description,
          en.controls.meta_description,
        ],
      }),
      media:
        this.editor.aboutMediaBlocksSave ||
        this.editor.gadgetHomeMediaBlocksSave
          ? 'error'
          : 'ok',
      publication:
        publication.publicationScheduleInvalid ||
        publication.publicationEndInvalid ||
        (publication.publicationRequiresPublishedTranslation &&
          !this.editor.defaultTranslationPublished)
          ? 'error'
          : 'ok',
    };
  }

  /** Called by the edit page when the API rejects a save. */
  showServerIssue(code: string): void {
    this.save.showServerIssue(code);
  }
}
