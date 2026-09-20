import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { Button } from '../../button/button';

@Component({
  selector: 'app-delivery-return-modal',
  standalone: true,
  imports: [Button, TranslateModule],
  templateUrl: './delivery-return-modal.html',
  styleUrl: './delivery-return-modal.scss',
})
export class DeliveryReturnModal {
  @Input() policy: string;

  constructor(public modal: NgbActiveModal) {}
}
