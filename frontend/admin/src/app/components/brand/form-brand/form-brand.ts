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

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { IBrand } from '../../../shared/interface/brand.interface';
import {
  CreateBrandAction,
  EditBrandAction,
  UpdateBrandAction,
} from '../../../shared/store/action/brand.action';
import { BrandState } from '../../../shared/store/state/brand.state';

@Component({
  selector: 'app-form-brand',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, FormFields, ImageUpload, Button],
  templateUrl: './form-brand.html',
  styleUrl: './form-brand.scss',
})
export class FormBrand {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  public form: FormGroup;
  public brand: IBrand | null;
  public mediaConfig = mediaConfig;

  private destroy$ = new Subject<void>();

  constructor() {
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      brand_image_id: new FormControl(),
      status: new FormControl(true),
      brand_banner_id: new FormControl(),
      brand_meta_image_id: new FormControl(),
      meta_title: new FormControl(),
      meta_description: new FormControl(),
    });
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditBrandAction(params['id']))
            .pipe(mergeMap(() => this.store.select(BrandState.selectedBrand)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(faq => {
        this.brand = faq;
        this.form.patchValue({
          name: this.brand?.name,
          brand_image_id: this.brand?.brand_image_id,
          brand_meta_image_id: this.brand?.brand_meta_image_id,
          meta_title: this.brand?.meta_title,
          brand_banner_id: this.brand?.brand_banner_id,
          meta_description: this.brand?.meta_description,
          status: this.brand?.status,
        });
      });
  }

  selectBrandImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['brand_image_id'].setValue(data ? data.id : '');
    }
  }

  selectBannerImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['brand_banner_id'].setValue(data ? data.id : '');
    }
  }

  selectMetaImage(data: IAttachment) {
    if (!Array.isArray(data)) {
      this.form.controls['brand_meta_image_id'].setValue(data ? data.id : '');
    }
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateBrandAction(this.form.value);

    if (this.type() == 'edit' && this.brand?.id) {
      action = new UpdateBrandAction(this.form.value, this.brand.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/brand');
        },
      });
    }
  }
}
