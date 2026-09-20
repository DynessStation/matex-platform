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

import { AdvanceDropdown } from '../../../shared/components/ui/advance-dropdown/advance-dropdown';
import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { IBlog } from '../../../shared/interface/blog.interface';
import { ICategoryModel } from '../../../shared/interface/category.interface';
import { ITagModel } from '../../../shared/interface/tag.interface';
import {
  CreateBlogAction,
  EditBlogAction,
  UpdateBlogAction,
} from '../../../shared/store/action/blog.action';
import { GetCategoriesAction } from '../../../shared/store/action/category.action';
import { GetTagsAction } from '../../../shared/store/action/tag.action';
import { BlogState } from '../../../shared/store/state/blog.state';
import { CategoryState } from '../../../shared/store/state/category.state';
import { TagState } from '../../../shared/store/state/tag.state';

@Component({
  selector: 'app-form-blog',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEditorModule,
    FormFields,
    ImageUpload,
    AdvanceDropdown,
    Button,
  ],
  templateUrl: './form-blog.html',
  styleUrl: './form-blog.scss',
})
export class FormBlog {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  blog$: Observable<IBlog> = inject(Store).select(BlogState.selectedBlog) as Observable<IBlog>;
  category$: Observable<ICategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<ICategoryModel>;
  tag$: Observable<ITagModel> = inject(Store).select(TagState.tag);

  public form: FormGroup;
  public id: number;
  public selectedCategories: number[] = [];
  public selectedTags: number[] = [];
  public editor: Editor;
  public mediaConfig = mediaConfig;
  public textArea = new FormControl('');
  public isCodeEditor = true;
  public html = '';
  private destroy$ = new Subject<void>();
  public isBrowser: boolean;
  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.store.dispatch(new GetCategoriesAction({ type: 'post' }));
    this.store.dispatch(new GetTagsAction({ type: 'post' }));
    this.form = this.formBuilder.group({
      title: new FormControl('', [Validators.required]),
      description: new FormControl(),
      content: new FormControl(),
      meta_title: new FormControl(),
      meta_description: new FormControl(),
      blog_thumbnail_id: new FormControl('', [Validators.required]),
      blog_meta_image_id: new FormControl(''),
      categories: new FormControl(),
      tags: new FormControl(),
      is_featured: new FormControl(0),
      is_sticky: new FormControl(0),
      status: new FormControl(1),
    });
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditBlogAction(params['id']))
            .pipe(mergeMap(() => this.store.select(BlogState.selectedBlog)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(blog => {
        this.id = blog?.id!;
        this.selectedCategories = blog?.categories.map(value => value?.id!)!;
        this.selectedTags = blog?.tags.map(value => value?.id!)!;
        this.form.patchValue({
          title: blog?.title,
          description: blog?.description,
          content: blog?.content,
          blog_thumbnail_id: blog?.blog_thumbnail_id,
          categories: this.selectedCategories,
          tags: this.selectedTags,
          blog_meta_image_id: blog?.blog_meta_image_id,
          meta_title: blog?.meta_title,
          meta_description: blog?.meta_description,
          is_featured: blog?.is_featured,
          is_sticky: blog?.is_sticky,
          status: blog?.status,
        });
      });

    if (this.isBrowser) {
      this.editor = new Editor();
    }
  }

  selectThumbnail(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['blog_thumbnail_id'].setValue(data ? data.id : '');
    }
  }

  selectMetaImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['blog_meta_image_id'].setValue(data ? data.id : null);
    }
  }

  selectCategoryItem(data: number[]) {
    if (Array.isArray(data)) {
      this.form.controls['categories'].setValue(data);
    }
  }

  selectTagItem(data: number[]) {
    if (Array.isArray(data)) {
      this.form.controls['tags'].setValue(data);
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
    let action = new CreateBlogAction(this.form.value);

    if (this.type() == 'edit' && this.id) {
      action = new UpdateBlogAction(this.form.value, this.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/blog');
        },
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
