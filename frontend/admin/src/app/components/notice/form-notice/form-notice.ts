import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, input } from '@angular/core';
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
import { Select2Module } from 'ng-select2-component';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { INotice } from '../../../shared/interface/notice.interface';
import {
  CreateNoticeAction,
  EditNoticeAction,
  UpdateNoticeAction,
} from '../../../shared/store/action/notice.action';
import { NoticeState } from '../../../shared/store/state/notice.state';

@Component({
  selector: 'app-form-notice',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEditorModule,
    Select2Module,
    FormFields,
    Button,
  ],
  templateUrl: './form-notice.html',
  styleUrl: './form-notice.scss',
})
export class FormNotice {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  public form: FormGroup;
  public notice: INotice | null;
  public priority = [
    {
      label: 'High',
      value: 'high',
    },
    {
      label: 'Low',
      value: 'low',
    },
  ];

  private destroy$ = new Subject<void>();
  public editor: Editor;
  public isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.formBuilder.group({
      title: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.required]),
      priority: new FormControl('', [Validators.required]),
    });
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditNoticeAction(params['id']))
            .pipe(mergeMap(() => this.store.select(NoticeState.selectedNotice)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(notice => {
        this.notice = notice;
        this.form.patchValue({
          title: this.notice?.title,
          description: this.notice?.description,
          priority: this.notice?.priority,
        });
      });

    if (this.isBrowser) {
      this.editor = new Editor();
    }
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateNoticeAction(this.form.value);

    if (this.type() == 'edit' && this.notice?.id) {
      action = new UpdateNoticeAction(this.form.value, this.notice.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/notice');
        },
      });
    }
  }
}
