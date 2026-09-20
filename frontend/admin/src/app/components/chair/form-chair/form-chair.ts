import { Component, effect, inject, input, output } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { Button } from '../../../shared/components/ui/button/button';

import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';

import { IChairDetail } from '../../../shared/interface/chair.interface';

//==================================================
//==== FORM VALUE
//==================================================

export interface ChairFormValue {
  chair_name: string;

  chair_description: string;
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-chair',

  imports: [ReactiveFormsModule, TranslateModule, FormFields, Button],

  templateUrl: './form-chair.html',

  styleUrl: './form-chair.scss',
})
export class FormChair {
  private formBuilder = inject(FormBuilder);

  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IChairDetail | null>(null);

  readonly formSubmit = output<ChairFormValue>();

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    chair_name: ['', [Validators.required, Validators.maxLength(255)]],

    chair_description: [''],
  });

  //==================================================
  //==== INIT
  //==================================================

  constructor() {
    effect(() => {
      const data = this.editData();

      if (!data) {
        return;
      }

      this.form.patchValue(
        {
          chair_name: data.chair_name,

          chair_description: data.chair_description ?? '',
        },

        {
          emitEvent: false,
        },
      );
    });
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const value = this.form.getRawValue();

    this.formSubmit.emit({
      chair_name: value.chair_name.trim(),

      chair_description: value.chair_description.trim(),
    });
  }
}
