import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HasPermissionDirective } from '../../../directive/has-permission.directive';

// Hidden for admins without content_assistant.use; the API enforces the same permission.
@Component({
  selector: 'app-ai-field-action',
  standalone: true,
  imports: [HasPermissionDirective],
  templateUrl: './ai-field-action.html',
  styleUrl: './ai-field-action.scss',
})
export class AiFieldAction {
  @Input() label = 'Isi ini otomatis';
  @Input() loadingLabel = 'Sedang menyiapkan draf…';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() icon = 'ri-edit-2-line';
  @Output() requested = new EventEmitter<void>();
}
