import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormUser } from '../form-user/form-user';

@Component({
  selector: 'app-create-user',
  imports: [PageWrapper, FormUser],
  templateUrl: './create-user.html',
  styleUrl: './create-user.scss',
})
export class CreateUser {}
