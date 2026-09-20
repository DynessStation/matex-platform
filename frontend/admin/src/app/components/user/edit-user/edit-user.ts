import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormUser } from '../form-user/form-user';

@Component({
  selector: 'app-edit-user',
  imports: [PageWrapper, FormUser],
  templateUrl: './edit-user.html',
  styleUrl: './edit-user.scss',
})
export class EditUser {}
