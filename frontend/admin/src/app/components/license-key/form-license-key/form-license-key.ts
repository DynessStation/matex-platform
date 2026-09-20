import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, Renderer2, DOCUMENT, input } from '@angular/core';
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
import {
  Select2,
  Select2Data,
  Select2Module,
  Select2SearchEvent,
  Select2UpdateEvent,
} from 'ng-select2-component';
import { Observable, Subject, debounceTime, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ILicenseKey } from '../../../shared/interface/license-key.interface';
import {
  CreateLicenseKeyAction,
  EditLicenseKeyAction,
  UpdateLicenseKeyAction,
} from '../../../shared/store/action/license-key.actions';
import { GetProductsAction } from '../../../shared/store/action/product.action';
import { LicenseKeysState } from '../../../shared/store/state/license-key.state';
import { ProductState } from '../../../shared/store/state/product.state';

@Component({
  selector: 'app-form-license-key',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    Select2Module,
    FormFields,
    Button,
  ],
  templateUrl: './form-license-key.html',
  styleUrl: './form-license-key.scss',
})
export class FormLicenseKey {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);

  readonly type = input<string>(undefined);

  product$: Observable<Select2Data> = inject(Store).select(ProductState.digitalProducts);

  public form: FormGroup;
  public licenseKey: ILicenseKey | null;
  private search = new Subject<string>();
  private destroy$ = new Subject<void>();
  public isBrowser: boolean;

  public separators: Select2Data = [
    {
      value: 'comma',
      label: 'Comma ( , )',
    },
    {
      value: 'semicolon',
      label: 'Semicolon ( ; )',
    },
    {
      value: 'pipe',
      label: 'Pipe ( | )',
    },
    {
      value: 'newline',
      label: 'Newline',
    },
  ];

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.formBuilder.group({
      license_key: new FormControl('', [Validators.required]),
      separator: new FormControl('', [Validators.required]),
      product_id: new FormControl('', [Validators.required]),
      variation_id: new FormControl(''),
      status: new FormControl(1),
    });
  }

  ngOnInit() {
    this.store.dispatch(new GetProductsAction({ status: 1, is_approved: 1, paginate: 15 }));
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditLicenseKeyAction(params['id']))
            .pipe(mergeMap(() => this.store.select(LicenseKeysState.selectedLicenseKey)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(licenseKey => {
        this.licenseKey = licenseKey;
        this.form.patchValue({
          license_key: this.licenseKey?.license_key,
          separator: this.licenseKey?.separator,
          product_id: this.licenseKey?.product_id,
          variation_id: this.licenseKey?.variation_id,
          status: this.licenseKey?.status,
        });
      });

    this.search
      .pipe(debounceTime(300)) // Adjust the debounce time as needed (in milliseconds)
      .subscribe(inputValue => {
        this.store.dispatch(
          new GetProductsAction({ status: 1, is_approved: 1, paginate: 15, search: inputValue }),
        );
        this.renderer.addClass(this.document.body, 'loader-none');
      });
  }

  productDropdown(event: Select2) {
    if (event['innerSearchText']) {
      this.search.next('');
    }
  }

  searchProduct(event: Select2SearchEvent) {
    this.search.next(event.search);
  }

  updateProduct(data: Select2UpdateEvent) {
    if (data && data.options.length) {
      if (data.options[0].data) {
        this.form.controls['product_id'].setValue(data.options[0].data.product_id);
        this.form.controls['variation_id'].setValue(
          data.options[0].data.variation_id ? data.options[0].data.variation_id : null,
        );
      }
    }
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateLicenseKeyAction(this.form.value);

    if (this.type() == 'edit' && this.licenseKey?.id) {
      action = new UpdateLicenseKeyAction(this.form.value, this.licenseKey.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/license-key');
        },
      });
    }
  }
}
