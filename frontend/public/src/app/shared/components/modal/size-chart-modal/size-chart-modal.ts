import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { Attachment } from '../../../interface/attachment.interface';
import { Button } from '../../button/button';

@Component({
  selector: 'app-size-chart-modal',
  standalone: true,
  imports: [Button, TranslateModule],
  templateUrl: './size-chart-modal.html',
  styleUrl: './size-chart-modal.scss',
})
export class SizeChartModal {
  @Input() image: Attachment;

  constructor(public modal: NgbActiveModal) {}
}
