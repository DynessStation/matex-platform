import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { ICategory } from '../../../../shared/interface/category.interface';
import { GetCategoriesAction } from '../../../../shared/store/action/category.action';
import { CategoryState } from '../../../../shared/store/state/category.state';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { HomeSectionKey } from '../website-page-form.model';

// Home page block of the Content tab: which sections the home page shows, the latex
// feature tabs, the popular tags (P-2), and the advertisement. Drafts live in
// WebsitePageEditorService.
@Component({
  selector: 'app-website-page-home-content',

  imports: [FormsModule, TranslateModule, AiFieldAction, HelpTip],

  templateUrl: './website-page-home-content.html',
})
export class WebsitePageHomeContent {
  readonly editor = inject(WebsitePageEditorService);

  readonly assistant = inject(WebsitePageAssistantService);

  private readonly store = inject(Store);

  private readonly categoryModel = toSignal(
    this.store.select(CategoryState.category),
  );

  /** Every product category for a tag destination, children as "Parent › Child". */
  readonly categoryOptions = computed(() => {
    const options: { id: string; label: string; published: boolean }[] = [];
    const walk = (items: ICategory[], prefix: string) => {
      for (const item of items) {
        const label = prefix ? `${prefix} › ${item.name}` : item.name;
        options.push({
          id: String(item.id),
          label,
          published: item.status === 'published',
        });
        walk(item.subcategories ?? [], label);
      }
    };
    walk(this.categoryModel()?.data ?? [], '');
    return options;
  });

  ngOnInit(): void {
    if (this.editor.isGadgetHomeTemplate) {
      this.store.dispatch(new GetCategoriesAction({ type: 'product' }));
    }
  }

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
      requiresVerifiedData: false,
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
