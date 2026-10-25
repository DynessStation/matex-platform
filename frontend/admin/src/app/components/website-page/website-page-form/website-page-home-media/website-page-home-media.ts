import { Component, inject, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
} from '../../../../shared/data/gadget-home-media';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { gadgetHomeMediaRequirement } from '../website-page-form.util';

// Home page media slots on the Media tab: one card per banner/tile slot plus the share
// image. Picking a slot is handed back to the Media tab, which owns the media modal.
@Component({
  selector: 'app-website-page-home-media',

  imports: [TranslateModule],

  templateUrl: './website-page-home-media.html',
})
export class WebsitePageHomeMedia {
  readonly editor = inject(WebsitePageEditorService);

  readonly pickSlot = output<GadgetHomeMediaRule>();

  readonly pickShareImage = output<void>();

  public readonly gadgetHomeMediaRules = GADGET_HOME_MEDIA_RULES;

  readonly gadgetHomeMediaRequirement = gadgetHomeMediaRequirement;
}
