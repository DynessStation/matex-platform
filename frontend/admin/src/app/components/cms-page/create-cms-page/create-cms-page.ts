import { Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-cms-page',

  imports: [PageWrapper, TranslateModule],

  templateUrl: './create-cms-page.html',
})
export class CreateCmsPage {}
