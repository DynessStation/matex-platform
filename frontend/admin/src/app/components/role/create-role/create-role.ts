import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormRole } from '../form-role/form-role';

@Component({
  selector: 'app-create-role',
  imports: [PageWrapper, FormRole],
  templateUrl: './create-role.html',
  styleUrl: './create-role.scss',
})
export class CreateRole {}
