import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ai-field-action',
  standalone: true,
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
