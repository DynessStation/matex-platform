import { Component, effect, inject, input, output } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { Button } from '../../../shared/components/ui/button/button';

import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';

import { IAdminPermissionDetailResponse } from '../../../shared/interface/admin-permission.interface';

//==================================================
//==== FORM VALUE
//==================================================

export interface AdminPermissionFormValue {
  permission_key: string;

  permission_name: string;

  permission_group: string;

  permission_description: string;
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-admin-permission',

  imports: [ReactiveFormsModule, TranslateModule, FormFields, Button],

  templateUrl: './form-admin-permission.html',

  styleUrl: './form-admin-permission.scss',
})
export class FormAdminPermission {
  private formBuilder = inject(FormBuilder);

  //==================================================
  //==== INPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IAdminPermissionDetailResponse['data'] | null>(
    null,
  );

  //==================================================
  //==== OUTPUT
  //==================================================

  readonly formSubmit = output<AdminPermissionFormValue>();

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    permission_key: [
      '',
      [
        Validators.required,

        Validators.maxLength(100),

        Validators.pattern(/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/),
      ],
    ],

    permission_name: ['', [Validators.required, Validators.maxLength(150)]],

    permission_group: ['', [Validators.maxLength(100)]],

    permission_description: ['', [Validators.maxLength(500)]],
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

      this.form.patchValue({
        permission_key: data.permission_key ?? '',

        permission_name: data.permission_name ?? '',

        permission_group: data.permission_group ?? '',

        permission_description: data.permission_description ?? '',
      });

      //==================================================
      //==== PERMISSION KEY IS IMMUTABLE
      //==================================================

      if (this.mode() === 'edit') {
        this.form.controls.permission_key.disable({
          emitEvent: false,
        });
      }
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

    const data = this.form.getRawValue();

    this.formSubmit.emit({
      permission_key: data.permission_key.trim().toLowerCase(),

      permission_name: data.permission_name.trim(),

      permission_group: data.permission_group.trim(),

      permission_description: data.permission_description.trim(),
    });
  }
}
