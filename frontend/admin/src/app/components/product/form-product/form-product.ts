import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ProductAssistantService } from './product-assistant.service';
import { ProductChannelsTab } from './product-channels-tab/product-channels-tab';
import { ProductContentTab } from './product-content-tab/product-content-tab';
import { ProductFormService } from './product-form.service';
import { ProductGeneralTab } from './product-general-tab/product-general-tab';
import { ProductMediaTab } from './product-media-tab/product-media-tab';
import { ProductSeoTab } from './product-seo-tab/product-seo-tab';
import { EnglishAutofill } from '../../../shared/components/ui/english/english-autofill';
import { EnglishToggle } from '../../../shared/components/ui/english/english-toggle';
import { FormHeading } from '../../../shared/components/ui/form-kit/form-heading';
import { FormSubmit } from '../../../shared/components/ui/form-kit/form-submit';
import { TabStatus } from '../../../shared/components/ui/form-kit/tab-status';

@Component({
  selector: 'app-form-product',
  imports: [
    ReactiveFormsModule,
    NgbModule,
    ProductGeneralTab,
    ProductContentTab,
    ProductChannelsTab,
    ProductMediaTab,
    ProductSeoTab,
    FormHeading,
    FormSubmit,
    TabStatus,
    EnglishToggle,
  ],
  templateUrl: './form-product.html',
  // Kept as component styles, used by every tab: several rules override base elements
  // (.form-control, .input-group-text) and nested selectors, so moving them to the global
  // layer changes the cascade. They move with the other base overrides in 6D.
  styleUrl: './form-product.scss',
  providers: [EnglishAutofill, ProductFormService, ProductAssistantService],
})
export class FormProduct implements OnInit, OnDestroy {
  readonly editor = inject(ProductFormService);
  readonly type = input<string>('create');

  constructor() {
    this.editor.connect({ type: this.type });
  }

  ngOnInit() {
    this.editor.init();
  }

  ngOnDestroy() {
    this.editor.destroy();
  }
}
