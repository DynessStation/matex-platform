import { Component, inject, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { mergeMap, of, Subject, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { IFaq } from '../../../shared/interface/faq.interface';
import {
  CreateFaqAction,
  EditFaqAction,
  UpdateFaqAction,
} from '../../../shared/store/action/faq.action';
import { FaqState } from '../../../shared/store/state/faq.state';

@Component({
  selector: 'app-form-faq',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, FormFields, Button],
  templateUrl: './form-faq.html',
  styleUrl: './form-faq.scss',
})
export class FormFaq {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  public form: FormGroup;
  public faq: IFaq | null;

  private destroy$ = new Subject<void>();

  constructor() {
    this.form = this.formBuilder.group({
      title: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.required]),
      status: new FormControl(true),
    });
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditFaqAction(params['id']))
            .pipe(mergeMap(() => this.store.select(FaqState.selectedFaq)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(faq => {
        this.faq = faq;
        this.form.patchValue({
          title: this.faq?.title,
          description: this.faq?.description,
          status: this.faq?.status,
        });
      });
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateFaqAction(this.form.value);

    if (this.type() == 'edit' && this.faq?.id) {
      action = new UpdateFaqAction(this.form.value, this.faq.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/faq');
        },
      });
    }
  }
}
