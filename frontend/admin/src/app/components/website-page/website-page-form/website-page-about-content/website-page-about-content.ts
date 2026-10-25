import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';

// About page block of the Content tab: the three highlight cards per language.
// Drafts live in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-about-content',

  imports: [TranslateModule, AiFieldAction],

  templateUrl: './website-page-about-content.html',
})
export class WebsitePageAboutContent {
  readonly editor = inject(WebsitePageEditorService);

  readonly assistant = inject(WebsitePageAssistantService);
}
