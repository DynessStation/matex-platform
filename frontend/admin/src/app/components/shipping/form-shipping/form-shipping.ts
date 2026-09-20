import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, viewChild, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { DeleteModal } from '../../../shared/components/ui/modal/delete-modal/delete-modal';
import { IValues } from '../../../shared/interface/setting.interface';
import { IShipping, IShippingRule } from '../../../shared/interface/shipping.interface';
import {
  CreateShippingRuleAction,
  DeleteShippingRuleAction,
  UpdateShippingRuleAction,
} from '../../../shared/store/action/shipping.action';
import { SettingState } from '../../../shared/store/state/setting.state';

@Component({
  selector: 'app-form-shipping',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    Select2Module,
    FormFields,
    Button,
    DeleteModal,
  ],
  templateUrl: './form-shipping.html',
  styleUrl: './form-shipping.scss',
})
export class FormShipping {
  private modalService = inject(NgbModal);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  readonly data = input<IShippingRule>(undefined);

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public form: FormGroup;
  public shipping_id: number;
  public isBrowser: boolean;

  public ruleType: Select2Data = [
    {
      value: 'base_on_price',
      label: 'Base on Price',
    },
    {
      value: 'base_on_weight',
      label: 'Base on Weight',
    },
  ];

  public shippingType: Select2Data = [
    {
      value: 'percentage',
      label: 'Percentage',
    },
    {
      value: 'free',
      label: 'Free',
    },
    {
      value: 'fixed',
      label: 'Fixed',
    },
  ];

  constructor() {
    const platformID = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformID);

    this.shipping_id = this.route.snapshot.params['id'];
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      shipping_id: new FormControl(this.shipping_id, []),
      rule_type: new FormControl('', [Validators.required]),
      min: new FormControl('', [Validators.required]),
      max: new FormControl('', [Validators.required]),
      shipping_type: new FormControl('fixed', [Validators.required]),
      amount: new FormControl('', [Validators.required]),
      status: new FormControl(1),
    });
  }

  ngOnChanges() {
    const data = this.data();
    if (data) {
      this.form.patchValue({
        name: data?.name,
        shipping_id: data?.shipping_id,
        rule_type: data?.rule_type,
        min: data?.min,
        max: data?.max,
        shipping_type: data?.shipping_type,
        amount: data?.amount,
        status: data?.status,
      });
    }
  }

  ngOnInit() {
    this.form.controls['shipping_type'].valueChanges.subscribe(data => {
      if (data === 'free') {
        this.form.removeControl('amount');
      } else {
        const dataValue = this.data();
        this.form.setControl(
          'amount',
          new FormControl(dataValue ? dataValue.amount : '', [Validators.required]),
        );
      }
    });
  }

  selectShippingType() {
    this.form.get('amount')?.setValue('');
  }

  submit() {
    this.form.markAllAsTouched();
    let action = new CreateShippingRuleAction(this.form.value);
    const data = this.data();
    if (data) {
      action = new UpdateShippingRuleAction(this.form.value, data.id);
    }
    if (this.form.valid) {
      this.store.dispatch(action).subscribe({
        complete: () => {
          this.modalService.dismissAll();
        },
      });
    }
  }

  delete(actionType: string, data: IShipping) {
    this.store.dispatch(new DeleteShippingRuleAction(data?.id));
  }
}
