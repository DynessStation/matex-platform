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
import { Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { AdvanceDropdown } from '../../../shared/components/ui/advance-dropdown/advance-dropdown';
import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { ICategory } from '../../../shared/interface/category.interface';
import {
  CreateCategoryAction,
  EditCategoryAction,
  UpdateCategoryAction,
} from '../../../shared/store/action/category.action';
import { CategoryState } from '../../../shared/store/state/category.state';

@Component({
  selector: 'app-form-category',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    PageWrapper,
    FormFields,
    AdvanceDropdown,
    ImageUpload,
    Button,
  ],
  templateUrl: './form-category.html',
  styleUrl: './form-category.scss',
})
export class FormCategory {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);
  readonly categories = input<ICategory[]>(undefined);
  readonly categoryType = input<string | null>('product');

  public form: FormGroup;
  public category: ICategory;
  public id: number;
  public mediaConfig = mediaConfig;

  private destroy$ = new Subject<void>();

  constructor() {
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      description: new FormControl(),
      parent_id: new FormControl(),
      type: new FormControl(this.categoryType(), []),
      commission_rate: new FormControl(),
      category_image_id: new FormControl(),
      category_icon_id: new FormControl(),
      category_meta_image_id: new FormControl(),
      meta_title: new FormControl(),
      meta_description: new FormControl(),
      status: new FormControl(true),
    });
  }

  ngOnChanges() {
    this.form.controls['type'].setValue(this.categoryType());
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditCategoryAction(params['id']))
            .pipe(mergeMap(() => this.store.select(CategoryState.selectedCategory)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(category => {
        this.category = category!;
        this.form.patchValue({
          name: this.category?.name,
          description: this.category?.description,
          parent_id: this.category?.parent_id,
          type: this.category?.type,
          commission_rate: this.category?.commission_rate,
          category_image_id: this.category?.category_image_id,
          category_icon_id: this.category?.category_icon_id,
          category_meta_image_id: this.category?.category_meta_image_id,
          meta_title: this.category?.meta_title,
          meta_description: this.category?.meta_description,
          status: this.category?.status,
        });
      });
  }

  selectItem(data: number[]) {
    if (Array.isArray(data) && data.length) {
      this.form.controls['parent_id'].setValue(data[0]);
    } else {
      this.form.controls['parent_id'].setValue('');
    }
  }

  selectCategoryImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['category_image_id'].setValue(data ? data.id : '');
    }
  }

  selectCategoryIcon(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['category_icon_id'].setValue(data ? data.id : '');
    }
  }

  selectMetaImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['category_meta_image_id'].setValue(data ? data.id : '');
    }
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateCategoryAction(this.form.value);

    if (this.type() == 'edit' && this.category?.id) {
      action = new UpdateCategoryAction(this.form.value, this.category.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          if (this.type() == 'create') {
            this.form.reset();
            this.form.controls['category_image_id'].setValue('');
            this.form.controls['category_icon_id'].setValue('');
            this.form.controls['status'].setValue(true);
          } else {
            if (this.form.value.type === 'product') {
              void this.router.navigateByUrl('/category');
            } else {
              void this.router.navigateByUrl('/blog/category');
            }
          }
        },
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
