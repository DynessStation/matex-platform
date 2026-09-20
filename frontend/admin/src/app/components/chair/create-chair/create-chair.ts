import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { IChairPayload } from '../../../shared/interface/chair.interface';

import { CreateChairAction } from '../../../shared/store/action/chair.action';

import { ChairFormValue, FormChair } from '../form-chair/form-chair';
import { TranslateModule } from '@ngx-translate/core';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-create-chair',

  imports: [PageWrapper, FormChair, TranslateModule],

  templateUrl: './create-chair.html',

  styleUrl: './create-chair.scss',
})
export class CreateChair {
  private store = inject(Store);

  private router = inject(Router);

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(value: ChairFormValue): void {
    const payload: IChairPayload = {
      chair_name: value.chair_name,

      chair_description: value.chair_description || null,
    };

    this.store.dispatch(new CreateChairAction(payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/chair');
      },
    });
  }
}
