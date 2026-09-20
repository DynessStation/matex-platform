import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormRole } from '../form-role/form-role';

@Component({
  selector: 'app-edit-role',
  imports: [PageWrapper, FormRole],
  templateUrl: './edit-role.html',
  styleUrl: './edit-role.scss',
})
export class EditRole {}
