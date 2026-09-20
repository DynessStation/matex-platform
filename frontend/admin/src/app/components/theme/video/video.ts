import { Component, inject, DOCUMENT } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2SearchEvent } from 'ng-select2-component';
import { Observable, Subject, forkJoin } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';
import { IVideo } from '../../../shared/interface/theme.interface';
import { GetProductsAction } from '../../../shared/store/action/product.action';
import { GetHomePageAction, UpdateHomePageAction } from '../../../shared/store/action/theme.action';
import { ThemeState } from '../../../shared/store/state/theme.state';

@Component({
  selector: 'app-video',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    HasPermissionDirective,
    PageWrapper,
    FormFields,
    ImageUpload,
    Button,
  ],
  templateUrl: './video.html',
  styleUrl: './video.scss',
})
export class Video {
  private store = inject(Store);
  private document = inject<Document>(DOCUMENT);

  home_page$: Observable<IVideo> = inject(Store).select(ThemeState.homePage);

  public form: FormGroup;
  public page_data: IVideo;
  public active = 'video';
  private search = new Subject<string>();
  public mediaConfig = mediaConfig;
  public filter = {
    status: 1,
    search: '',
    paginate: 15,
    ids: '',
    with_union_products: 0,
    is_approved: 1,
  };

  constructor() {
    this.form = new FormGroup({
      content: new FormGroup({
        video: new FormGroup({
          status: new FormControl(true),
          video_url: new FormControl(''),
        }),
      }),
      slug: new FormControl('video'),
    });
  }

  ngOnInit() {
    const home_page$ = this.store.dispatch(new GetHomePageAction({ slug: 'video' }));
    forkJoin([home_page$]).subscribe({
      complete: () => {
        this.store.select(ThemeState.homePage).subscribe({
          next: homePage => {
            if (homePage?.content?.products_ids) {
              this.filter['paginate'] =
                homePage?.content?.products_ids?.length >= 15
                  ? homePage?.content?.products_ids?.length
                  : 15;
              this.filter['ids'] = homePage?.content?.products_ids?.join();
              this.filter['with_union_products'] = homePage?.content?.products_ids?.length
                ? homePage?.content?.products_ids?.length >= 15
                  ? 0
                  : 1
                : 0;
            }
            this.store.dispatch(new GetProductsAction(this.filter)).subscribe({
              complete: () => {
                this.patchForm();
              },
            });
          },
        });
      },
    });
  }

  patchForm() {
    this.home_page$.subscribe(homePage => {
      this.page_data = homePage;
      this.form.patchValue({
        content: {
          video: {
            status: homePage?.content?.video?.status,
            video_url: homePage?.content?.video?.video_url,
          },
        },
        slug: homePage?.slug,
      });
    });
  }

  selectCategoryItem(data: Number[], key: string) {
    if (Array.isArray(data)) {
      this.form.get(key)?.setValue(data);
    }
  }

  selectBanner(url: string, key: string) {
    this.form.get(key)?.setValue(url ? url : null);
  }

  searchProduct(event: Select2SearchEvent) {
    this.search.next(event.search);
  }

  // Merge Products Ids

  concatDynamicProductKeys(obj: IVideo): number[] {
    const result: number[] = [];

    function traverse(value: unknown): void {
      if (Array.isArray(value)) {
        value.forEach(traverse);
      } else if (value !== null && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          if (
            key === 'product_ids' &&
            Array.isArray(nested) &&
            nested.every(item => typeof item === 'number')
          ) {
            result.push(...nested);
          } else if (key === 'product_ids' && typeof nested === 'number') {
            result.push(nested);
          } else {
            traverse(nested);
          }
        }
      }
    }

    traverse(obj);
    return result;
  }

  submit() {
    const productIds = Array.from(new Set(this.concatDynamicProductKeys(this.form.value)));
    this.form.get('content.products_ids')?.setValue(productIds);

    if (this.form.valid) {
      this.store.dispatch(new UpdateHomePageAction(this.page_data.id, this.form.value));
    }
  }
}
