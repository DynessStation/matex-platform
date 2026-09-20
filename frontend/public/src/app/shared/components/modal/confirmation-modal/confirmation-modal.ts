import { Component, inject, output } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { AuthService } from '../../../services/auth.service';
import { Button } from '../../button/button';

@Component({
  selector: 'app-confirmation-modal',
  imports: [Button, TranslateModule],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.scss',
})
export class ConfirmationModal {
  modal = inject(NgbModal);
  private authService = inject(AuthService);
  private store = inject(Store);

  readonly confirm = output<Boolean>();

  confirmation() {
    this.confirm.emit(true);
  }
}
