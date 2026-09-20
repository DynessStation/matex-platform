import { Component } from '@angular/core';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { FormLicenseKey } from '../form-license-key/form-license-key';

@Component({
  selector: 'app-edit-license-key',
  imports: [PageWrapper, FormLicenseKey],
  templateUrl: './edit-license-key.html',
  styleUrl: './edit-license-key.scss',
})
export class EditLicenseKey {}
