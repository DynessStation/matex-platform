import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { IOfficePayload } from '../../../shared/interface/office.interface';

import { CreateOfficeAction } from '../../../shared/store/action/office.action';

import { FormOffice } from '../form-office/form-office';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-create-office',

  imports: [PageWrapper, FormOffice, TranslateModule],

  templateUrl: './create-office.html',

  styleUrl: './create-office.scss',
})
export class CreateOffice {
  private store = inject(Store);

  private router = inject(Router);

  submit(payload: IOfficePayload): void {
    this.store.dispatch(new CreateOfficeAction(payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/office');
      },
    });
  }
}
