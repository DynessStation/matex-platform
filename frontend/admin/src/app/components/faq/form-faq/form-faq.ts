import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { finalize } from 'rxjs';

import { AiFieldAction } from '../../../shared/components/ui/ai-field-action/ai-field-action';
import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { positionText } from '../../../shared/components/ui/order-list/order-list.util';
import { IApiErrorResponse } from '../../../shared/interface/api-response.interface';
import {
  IFaqDetail,
  IFaqPayload,
  IFaqTranslation,
} from '../../../shared/interface/faq.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  CreateFaqAction,
  EditFaqAction,
  UpdateFaqAction,
} from '../../../shared/store/action/faq.action';
import { FaqState } from '../../../shared/store/state/faq.state';

@Component({
  selector: 'app-form-faq',
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    FormFields,
    Button,
    AiFieldAction,
  ],
  templateUrl: './form-faq.html',
  styleUrl: './form-faq.scss',
})
export class FormFaq {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private contentAssistant = inject(ContentAssistantService);
  private notification = inject(NotificationService);
  private formIssues = inject(FormIssueNavigatorService);
  assistingField: 'id_answer' | 'en_answer' | null = null;
  assistingMode: 'generate' | 'translate' | null = null;

  readonly type = input<'create' | 'edit'>('create');
  private faq: IFaqDetail | null = null;
  // Read-only: the place is set with "Atur urutan" in the FAQ list.
  position = positionText(null, null);

  readonly form = this.fb.group({
    key: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    status: [true],
    id_question: ['', [Validators.required, Validators.maxLength(500)]],
    id_answer: ['', [Validators.required, Validators.maxLength(50000)]],
    en_question: ['', [Validators.required, Validators.maxLength(500)]],
    en_answer: ['', [Validators.required, Validators.maxLength(50000)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.store.dispatch(new EditFaqAction(id)).subscribe(() => {
      const faq = this.store.selectSnapshot(FaqState.selectedFaq);
      if (!faq) return;
      this.faq = faq;
      this.position = positionText(faq.position, faq.position_total);
      const indonesia = faq.translations.find(
        (item) => item.locale === 'id-ID',
      );
      const english = faq.translations.find((item) => item.locale === 'en-US');
      this.form.patchValue({
        key: faq.key,
        status: faq.status === 1,
        id_question: indonesia?.question ?? '',
        id_answer: indonesia?.answer ?? '',
        en_question: english?.question ?? '',
        en_answer: english?.answer ?? '',
      });
    });
  }

  generateAnswer(locale: 'id' | 'en'): void {
    const value = this.form.getRawValue();
    const target = `${locale}_answer` as 'id_answer' | 'en_answer';
    if (this.assistingField) return;
    this.assistingField = target;
    this.assistingMode = 'generate';
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'faq',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: String(value[`${locale}_question`] || ''),
        fields: { answer: String(value[`${locale}_answer`] || '') },
        field_types: { answer: 'multiline_text' },
      })
      .pipe(
        finalize(() => {
          this.assistingField = null;
          this.assistingMode = null;
        }),
      )
      .subscribe({
        next: (fields) => {
          this.form.controls[`${locale}_answer`].setValue(
            fields['answer'] || '',
          );
          this.notification.showSuccess(
            'Draf jawaban dibuat. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  copyAndTranslateToEnglish(): void {
    const value = this.form.getRawValue();
    if (this.assistingField) return;
    this.assistingField = 'en_answer';
    this.assistingMode = 'translate';
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'faq',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: {
          answer: value.id_answer || '',
        },
        field_types: { answer: 'multiline_text' },
      })
      .pipe(
        finalize(() => {
          this.assistingField = null;
          this.assistingMode = null;
        }),
      )
      .subscribe({
        next: (fields) => {
          this.form.patchValue({
            en_answer: fields['answer'] || '',
          });
          this.notification.showSuccess(
            'Jawaban English sudah diisi dari Bahasa Indonesia. Pertanyaan tetap Anda tulis sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  private showAssistantError(error: IApiErrorResponse): void {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan penulisan belum berhasil. Coba lagi sebentar.',
    );
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notification.showError(
        'Form FAQ belum lengkap. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();
      return;
    }
    const value = this.form.getRawValue();
    const translations: IFaqTranslation[] = [
      {
        locale: 'id-ID',
        question: value.id_question!,
        answer: value.id_answer!,
        status: 1,
      },
      {
        locale: 'en-US',
        question: value.en_question!,
        answer: value.en_answer!,
        status: 1,
      },
    ];
    const payload: IFaqPayload = {
      key: value.key!,
      status: value.status ? 1 : 0,
      translations,
    };
    const action =
      this.type() === 'edit' && this.faq
        ? new UpdateFaqAction(payload, this.faq.id)
        : new CreateFaqAction(payload);
    this.store.dispatch(action).subscribe({
      complete: () => void this.router.navigateByUrl('/faq'),
      error: (error) => {
        if (error?.error?.code !== 'FAQ_KEY_EXISTS') return;
        this.form.controls.key.setErrors({
          ...(this.form.controls.key.errors ?? {}),
          duplicate: true,
        });
        this.formIssues.focusFirstInvalid('key');
      },
    });
  }
}
