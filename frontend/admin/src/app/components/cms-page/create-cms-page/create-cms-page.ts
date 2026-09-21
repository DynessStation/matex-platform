import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { FormCmsPage } from '../form-cms-page/form-cms-page';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-cms-page',

  imports: [RouterModule, TranslateModule, PageWrapper, FormCmsPage],

  templateUrl: './create-cms-page.html',
})
export class CreateCmsPage {}
