import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { finalize } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { ICmsPageSaveRequest } from '../../../shared/interface/cms-page.interface';

import { SaveCmsPageAction } from '../../../shared/store/action/cms-page.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

import { FormCmsPage } from '../form-cms-page/form-cms-page';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-cms-page',

  imports: [RouterModule, TranslateModule, PageWrapper, FormCmsPage],

  templateUrl: './create-cms-page.html',
})
export class CreateCmsPage {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private router = inject(Router);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== STATE
  //==================================================

  public saving = false;

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(request: ICmsPageSaveRequest): void {
    if (this.saving) {
      return;
    }

    this.saving = true;

    this.store
      .dispatch(new SaveCmsPageAction('create', null, request))
      .pipe(
        finalize(() => {
          this.saving = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => {
          const id = this.store.selectSnapshot(CmsPageState.lastSavedId);

          if (!id) {
            return;
          }

          void this.router.navigate(['/cms-page', id]);
        },
      });
  }
}
