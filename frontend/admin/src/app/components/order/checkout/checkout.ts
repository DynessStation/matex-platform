import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, Renderer2, DOCUMENT, viewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import {
  Select2,
  Select2Data,
  Select2Module,
  Select2SearchEvent,
  Select2UpdateEvent,
} from 'ng-select2-component';
import { Observable, Subject, debounceTime, forkJoin } from 'rxjs';

import { AddressBlock } from './address-block/address-block';
import { DeliveryBlock } from './delivery-block/delivery-block';
import { AddAddressModal } from './modal/add-address-modal/add-address-modal';
import { AddCustomerModal } from './modal/add-customer-modal/add-customer-modal';
import { PaymentBlock } from './payment-block/payment-block';
import { Loader } from '../../../shared/components/loader/loader';
import { Button } from '../../../shared/components/ui/button/button';
import { NoData } from '../../../shared/components/ui/no-data/no-data';
import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';
import { ICart } from '../../../shared/interface/cart.interface';
import { IOrderCheckout } from '../../../shared/interface/order.interface';
import { IDeliveryBlock, IValues } from '../../../shared/interface/setting.interface';
import { IUser } from '../../../shared/interface/user.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency-symbol.pipe';
import { GetCartItemsAction } from '../../../shared/store/action/cart.action';
import {
  CheckoutAction,
  ClearAction,
  PlaceOrderAction,
  SelectUserAction,
} from '../../../shared/store/action/order.action';
import { GetSettingOptionAction } from '../../../shared/store/action/setting.action';
import { GetUsersAction } from '../../../shared/store/action/user.action';
import { CartState } from '../../../shared/store/state/cart.state';
import { LoaderState } from '../../../shared/store/state/loader.state';
import { OrderState } from '../../../shared/store/state/order.state';
import { SettingState } from '../../../shared/store/state/setting.state';
import { UserState } from '../../../shared/store/state/user.state';

@Component({
  selector: 'app-checkout',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    HasPermissionDirective,
    ReactiveFormsModule,
    Select2Module,
    CurrencySymbolPipe,
    Loader,
    AddressBlock,
    DeliveryBlock,
    PaymentBlock,
    NoData,
    Button,
    AddCustomerModal,
    AddAddressModal,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private router = inject(Router);
  private document = inject<Document>(DOCUMENT);
  private renderer = inject(Renderer2);
  private store = inject(Store);
  private formBuilder = inject(FormBuilder);

  loadingStatus$: Observable<boolean> = inject(Store).select(
    LoaderState.status,
  ) as Observable<boolean>;
  users$: Observable<Select2Data> = inject(Store).select(UserState.users);
  cartItem$: Observable<ICart[]> = inject(Store).select(CartState.cartItems);
  cartDigital$: Observable<boolean | number> = inject(Store).select(
    CartState.cartHasDigital,
  ) as Observable<boolean | number>;
  checkout$: Observable<IOrderCheckout> = inject(Store).select(
    OrderState.checkout,
  ) as Observable<IOrderCheckout>;
  selectedUser$: Observable<IUser> = inject(Store).select(
    OrderState.selectedUser,
  ) as Observable<IUser>;
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  readonly AddAddressModal = viewChild<AddAddressModal>('addAddressModal');
  readonly AddCustomerModal = viewChild<AddCustomerModal>('addCustomerModal');

  readonly cpnRef = viewChild<ElementRef<HTMLInputElement>>('cpn');

  public form: FormGroup;
  public coupon: boolean = true;
  public couponCode: string;
  public appliedCoupon: boolean = false;
  public couponError: string | null;
  public checkoutTotal: IOrderCheckout | null = null;
  public loading: boolean = false;
  public addressLoading: boolean = false;
  private search = new Subject<string>();

  constructor() {
    const user$ = this.store.dispatch(
      new GetUsersAction({ role: 'consumer', status: 1, paginate: 15 }),
    );
    const cart$ = this.store.dispatch(new GetCartItemsAction());
    const setting$ = this.store.dispatch(new GetSettingOptionAction());
    forkJoin([user$, cart$, setting$]).subscribe({
      complete: () => {
        this.renderer.addClass(this.document.body, 'loader-none');
      },
    });

    this.form = this.formBuilder.group({
      consumer_id: new FormControl('', [Validators.required]),
      products: this.formBuilder.array([], [Validators.required]),
      shipping_address_id: new FormControl('', []),
      billing_address_id: new FormControl('', [Validators.required]),
      points_amount: new FormControl(),
      wallet_balance: new FormControl(),
      coupon: new FormControl(),
      delivery_description: new FormControl('', [Validators.required]),
      delivery_interval: new FormControl(),
      payment_method: new FormControl('', [Validators.required]),
    });

    this.cartDigital$.subscribe(value => {
      if (value == 1) {
        this.form.controls['shipping_address_id'].clearValidators();
        this.form.controls['delivery_description'].clearValidators();
      } else {
        this.form.controls['shipping_address_id'].setValidators([Validators.required]);
        this.form.controls['delivery_description'].setValidators([Validators.required]);
      }
      this.form.controls['shipping_address_id'].updateValueAndValidity();
      this.form.controls['delivery_description'].updateValueAndValidity();
    });

    this.form.valueChanges.subscribe(_form => {
      this.checkout();
    });
  }

  get productControl(): FormArray {
    return this.form.get('products') as FormArray;
  }

  ngOnInit() {
    this.checkout$.subscribe(data => (this.checkoutTotal = data));
    this.cartItem$.subscribe(items => {
      this.productControl.clear();
      items!.forEach((item: ICart) =>
        this.productControl.push(
          this.formBuilder.group({
            product_id: new FormControl(item?.product_id, [Validators.required]),
            variation_id: new FormControl(item?.variation_id ? item?.variation_id : ''),
            quantity: new FormControl(item?.quantity),
          }),
        ),
      );
    });

    this.search
      .pipe(debounceTime(300)) // Adjust the debounce time as needed (in milliseconds)
      .subscribe(inputValue => {
        this.store.dispatch(
          new GetUsersAction({ role: 'consumer', status: 1, paginate: 15, search: inputValue }),
        );
        this.renderer.addClass(this.document.body, 'loader-none');
      });
  }

  selectUser(data: Select2UpdateEvent) {
    if (data?.value) {
      this.form.controls['shipping_address_id'].reset();
      this.form.controls['billing_address_id'].reset();
      this.form.controls['points_amount'].reset();
      this.form.controls['wallet_balance'].reset();
      this.form.controls['coupon'].reset();
      this.addressLoading = true;
      this.store.dispatch(new SelectUserAction(Number(data?.value))).subscribe({
        complete: () => {
          this.addressLoading = false;
        },
      });
    }
  }

  userDropdown(event: Select2) {
    if (event['innerSearchText']) {
      this.search.next('');
    }
  }

  searchUser(event: Select2SearchEvent) {
    this.search.next(event.search);
  }

  selectShippingAddress(id: number) {
    if (id) {
      this.form.controls['shipping_address_id'].setValue(Number(id));
    }
  }

  selectBillingAddress(id: number) {
    if (id) {
      this.form.controls['billing_address_id'].setValue(Number(id));
    }
  }

  selectDelivery(value: IDeliveryBlock) {
    if (value?.delivery_description != this.form.controls['delivery_description'].value)
      this.form.controls['delivery_description'].setValue(value?.delivery_description);
    if (value.delivery_interval)
      this.form.controls['delivery_interval'].setValue(value?.delivery_interval);
  }

  selectPaymentMethod(value: string) {
    this.form.controls['payment_method'].setValue(value);
  }

  showCoupon() {
    this.coupon = true;
  }

  setCoupon(value?: string) {
    this.couponError = null;
    if (value) this.form.controls['coupon'].setValue(value);
    else this.form.controls['coupon'].reset();
    this.store.dispatch(new CheckoutAction(this.form.value)).subscribe({
      error: err => {
        this.couponError = err.message;
      },
      complete: () => {
        this.appliedCoupon = value ? true : false;
        this.couponError = null;
      },
    });
  }

  couponRemove() {
    this.setCoupon();
  }

  checkout() {
    if (this.form.valid) {
      this.loading = true;
      this.store.dispatch(new CheckoutAction(this.form.value)).subscribe({
        error: () => {
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
    } else {
      Object?.keys(this.form?.controls).filter(key => this.form.controls[key].invalid);
    }
  }

  placeorder() {
    if (this.form.valid) {
      this.store.dispatch(new PlaceOrderAction(this.form.value));
    }
  }

  ngOnDestroy() {
    this.store.dispatch(new ClearAction());
    this.form.reset();
    this.search.next('');
    this.search.complete();
    this.renderer.removeClass(this.document.body, 'loader-none');
  }
}
