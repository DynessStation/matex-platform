import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormNotice } from '../form-notice/form-notice';

@Component({
  selector: 'app-edit-notice',
  imports: [PageWrapper, FormNotice],
  templateUrl: './edit-notice.html',
  styleUrl: './edit-notice.scss',
})
export class EditNotice {}
