import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, input } from '@angular/core';
import {
  FormArray,
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
import { Select2Data, Select2Module } from 'ng-select2-component';
import { Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import {
  CreateAttributeAction,
  EditAttributeAction,
  UpdateAttributeAction,
} from '../../../shared/store/action/attribute.action';
import { AttributeState } from '../../../shared/store/state/attribute.state';

@Component({
  selector: 'app-form-attribute',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, Select2Module, FormFields, Button],
  templateUrl: './form-attribute.html',
  styleUrl: './form-attribute.scss',
})
export class FormAttribute {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  readonly type = input<string>(undefined);

  public form: FormGroup;
  public documents = [{ value: '', hex_color: '', id: '' }];
  public id: number;

  private destroy$ = new Subject<void>();
  public isBrowser: boolean;

  public variantStyle: Select2Data = [
    {
      value: 'rectangle',
      label: 'Rectangle',
    },
    {
      value: 'circle',
      label: 'Circle',
    },
    {
      value: 'radio',
      label: 'Radio',
    },
    {
      value: 'dropdown',
      label: 'Dropdown',
    },
    {
      value: 'image',
      label: 'Image',
    },
    {
      value: 'color',
      label: 'Color',
    },
  ];

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      style: new FormControl('rectangle', [Validators.required]),
      status: new FormControl(1),
      value: this.formBuilder.array([], [Validators.required]),
    });
  }

  get valueControl(): FormArray {
    return this.form.get('value') as FormArray;
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditAttributeAction(params['id']))
            .pipe(mergeMap(() => this.store.select(AttributeState.selectedAttribute)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(attribute => {
        this.id = attribute?.id!;
        // Set Value in form
        this.form.patchValue({
          name: attribute?.name,
          style: attribute?.style,
          status: attribute?.status,
        });
        // Set Attribute Values
        attribute?.attribute_values!.forEach(document =>
          this.valueControl.push(
            this.formBuilder.group({
              value: new FormControl(document.value, [Validators.required]),
              hex_color: new FormControl(document.hex_color),
              id: new FormControl(document.id, []),
            }),
          ),
        );
      });

    if (this.type() == 'create') {
      this.documents.forEach(document =>
        this.valueControl.push(
          this.formBuilder.group({
            value: [document.value, [Validators.required]],
            hex_color: [document.hex_color],
            id: [document.id],
          }),
        ),
      );
    }
  }

  add(event: Event) {
    event.preventDefault();
    const valueGroup =
      this.form.get('style')!.value === 'color'
        ? this.formBuilder.group({
            value: ['', [Validators.required]],
            hex_color: [''],
          })
        : this.formBuilder.group({
            value: ['', [Validators.required]],
          });
    this.valueControl.push(valueGroup);
  }

  remove(index: number) {
    if (this.valueControl.length <= 1) return;
    this.valueControl.removeAt(+index);
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateAttributeAction(this.form.value);

    if (this.type() == 'edit' && this.id) {
      action = new UpdateAttributeAction(this.form.value, this.id);
    }

    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          void this.router.navigateByUrl('/attribute');
        },
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
