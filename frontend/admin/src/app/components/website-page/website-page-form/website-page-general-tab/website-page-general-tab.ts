import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { WebsitePageEditorService } from '../website-page-editor.service';

// General tab of the fixed website page form: the page's code, addresses, and status,
// read-only (the system sets them; the API stores only content, media, and publication).
@Component({
  selector: 'app-website-page-general-tab',

  imports: [HelpTip, TranslateModule],

  templateUrl: './website-page-general-tab.html',
})
export class WebsitePageGeneralTab {
  readonly editor = inject(WebsitePageEditorService);

  goToContent(): void {
    this.editor.activeTab = 'content';
  }
}
