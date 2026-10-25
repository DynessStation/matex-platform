import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { HomeSectionKey } from '../website-page-form.model';

// Home page block of the Content tab: which sections the home page shows, the latex
// feature tabs, and the advertisement. Drafts live in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-home-content',

  imports: [FormsModule, TranslateModule, AiFieldAction],

  templateUrl: './website-page-home-content.html',
})
export class WebsitePageHomeContent {
  readonly editor = inject(WebsitePageEditorService);

  readonly assistant = inject(WebsitePageAssistantService);

  public readonly homeSectionOptions: readonly {
    key: HomeSectionKey;
    labelKey: string;
    descriptionKey: string;
    requiresVerifiedData: boolean;
  }[] = [
    {
      key: 'latex_features',
      labelKey: 'website_page.home_section_latex_features',
      descriptionKey: 'website_page.home_section_latex_features_help',
      requiresVerifiedData: false,
    },
    {
      key: 'categories',
      labelKey: 'website_page.home_section_categories',
      descriptionKey: 'website_page.home_section_categories_help',
      requiresVerifiedData: false,
    },
    {
      key: 'products',
      labelKey: 'website_page.home_section_products',
      descriptionKey: 'website_page.home_section_products_help',
      requiresVerifiedData: false,
    },
    {
      key: 'articles',
      labelKey: 'website_page.home_section_articles',
      descriptionKey: 'website_page.home_section_articles_help',
      requiresVerifiedData: false,
    },
    {
      key: 'tags',
      labelKey: 'website_page.home_section_tags',
      descriptionKey: 'website_page.home_section_tags_help',
      requiresVerifiedData: true,
    },
    {
      key: 'newsletter',
      labelKey: 'website_page.home_section_newsletter',
      descriptionKey: 'website_page.home_section_newsletter_help',
      requiresVerifiedData: true,
    },
    {
      key: 'advertisement',
      labelKey: 'website_page.home_section_advertisement',
      descriptionKey: 'website_page.home_section_advertisement_help',
      requiresVerifiedData: false,
    },
  ];
}
