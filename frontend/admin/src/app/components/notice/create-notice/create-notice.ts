import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormNotice } from '../form-notice/form-notice';

@Component({
  selector: 'app-create-notice',
  imports: [PageWrapper, FormNotice],
  templateUrl: './create-notice.html',
  styleUrl: './create-notice.scss',
})
export class CreateNotice {}
