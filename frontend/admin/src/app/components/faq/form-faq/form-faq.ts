import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { IFaqDetail, IFaqPayload, IFaqTranslation } from '../../../shared/interface/faq.interface';
import { CreateFaqAction, EditFaqAction, UpdateFaqAction } from '../../../shared/store/action/faq.action';
import { FaqState } from '../../../shared/store/state/faq.state';

@Component({
  selector: 'app-form-faq',
  imports: [ReactiveFormsModule, TranslateModule, FormFields, Button],
  templateUrl: './form-faq.html',
  styleUrl: './form-faq.scss',
})
export class FormFaq {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  readonly type = input<'create' | 'edit'>('create');
  private faq: IFaqDetail | null = null;

  readonly form = this.fb.group({
    key: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    sort_order: [0, [Validators.required, Validators.min(0)]],
    status: [true],
    id_question: ['', Validators.required], id_answer: ['', Validators.required],
    en_question: ['', Validators.required], en_answer: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.store.dispatch(new EditFaqAction(id)).subscribe(() => {
      const faq = this.store.selectSnapshot(FaqState.selectedFaq);
      if (!faq) return;
      this.faq = faq;
      const indonesia = faq.translations.find(item => item.locale === 'id-ID');
      const english = faq.translations.find(item => item.locale === 'en-US');
      this.form.patchValue({
        key: faq.key, sort_order: faq.sort_order, status: faq.status === 1,
        id_question: indonesia?.question ?? '', id_answer: indonesia?.answer ?? '',
        en_question: english?.question ?? '', en_answer: english?.answer ?? '',
      });
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const translations: IFaqTranslation[] = [
      { locale: 'id-ID', question: value.id_question!, answer: value.id_answer!, status: 1 },
      { locale: 'en-US', question: value.en_question!, answer: value.en_answer!, status: 1 },
    ];
    const payload: IFaqPayload = {
      key: value.key!, sort_order: Number(value.sort_order), status: value.status ? 1 : 0, translations,
    };
    const action = this.type() === 'edit' && this.faq
      ? new UpdateFaqAction(payload, this.faq.id)
      : new CreateFaqAction(payload);
    this.store.dispatch(action).subscribe({ complete: () => void this.router.navigateByUrl('/faq') });
  }
}
