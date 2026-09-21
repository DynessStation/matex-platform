import { Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-edit-cms-page',

  imports: [PageWrapper, TranslateModule],

  templateUrl: './edit-cms-page.html',
})
export class EditCmsPage {}
