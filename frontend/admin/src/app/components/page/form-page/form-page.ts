import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, input } from '@angular/core';
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
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Observable, Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { IPage } from '../../../shared/interface/page.interface';
import {
  CreatePageAction,
  EditPageAction,
  UpdatePageAction,
} from '../../../shared/store/action/page.action';
import { PageState } from '../../../shared/store/state/page.state';

@Component({
  selector: 'app-form-page',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEditorModule,
    CommonModule,
    FormFields,
    ImageUpload,
    Button,
  ],
  templateUrl: './form-page.html',
  styleUrl: './form-page.scss',
})
export class FormPage {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  page$: Observable<IPage> = inject(Store).select(PageState.selectedPage) as Observable<IPage>;

  private destroy$ = new Subject<void>();
  public html = '';
  public form: FormGroup;
  public id: number;
  public mediaConfig = mediaConfig;
  public editor: Editor;
  public isCodeEditor = true;
  public textArea = new FormControl('');
  public isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.formBuilder.group({
      title: new FormControl('', [Validators.required]),
      content: new FormControl(),
      meta_title: new FormControl(),
      meta_description: new FormControl(),
      page_meta_image_id: new FormControl(),
      status: new FormControl(1),
    });
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditPageAction(params['id']))
            .pipe(mergeMap(() => this.store.select(PageState.selectedPage)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(page => {
        this.id = page?.id!;
        this.form.patchValue({
          title: page?.title,
          content: page?.content,
          meta_title: page?.meta_title,
          meta_description: page?.meta_description,
          status: page?.status,
        });
      });

    if (this.isBrowser) {
      this.editor = new Editor();
    }
  }

  selectMetaImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['page_meta_image_id'].setValue(data ? data.id : null);
    }
  }

  getText(_event: Event) {
    this.form.controls['content'].setValue(this.textArea.value);
  }

  getData(_description: Event) {
    this.textArea.setValue(this.html);
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreatePageAction(this.form.value);

    if (this.type() == 'edit' && this.id) {
      action = new UpdatePageAction(this.form.value, this.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/page');
        },
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
