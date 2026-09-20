import { Component, inject, output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/button/button';
import { Alert } from '../../../shared/components/widgets/alert/alert';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { CartAddOrUpdate, ICart } from '../../../shared/interface/cart.interface';
import { Values } from '../../../shared/interface/setting.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { AuthService } from '../../../shared/services/auth.service';
import { LoginAction } from '../../../shared/store/action/auth.action';
import { GetCartItems, SyncCart } from '../../../shared/store/action/cart.action';
import { CartState } from '../../../shared/store/state/cart.state';
import { SettingState } from '../../../shared/store/state/setting.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';

@Component({
  selector: 'app-login',
  imports: [Button, FormsModule, ReactiveFormsModule, Alert, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private store = inject(Store);
  private authService = inject(AuthService);
  formBuilder = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private router = inject(Router);

  cartItem$: Observable<ICart[]> = inject(Store).select(CartState.cartItems) as Observable<ICart[]>;
  setting$: Observable<Values> = inject(Store).select(SettingState.setting) as Observable<Values>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  readonly activeForm = output<string>();

  public validate: boolean = false;
  public loginForm: FormGroup;

  public breadcrumb: breadcrumb = {
    title: "customer's login",
    items: [
      {
        label: 'login',
        active: true,
      },
    ],
  };

  constructor() {
    this.loginForm = new FormGroup({
      email: new FormControl('john.customer@example.com', [Validators.required, Validators.email]),
      password: new FormControl('123456789', Validators.required),
    });
  }

  submit() {
    this.loginForm.markAllAsTouched();
    this.validate = true;
    if (this.loginForm.valid) {
      this.store.dispatch(new LoginAction(this.loginForm.value)).subscribe({
        complete: () => {
          this.modalService.dismissAll();
          // Sync Cart Storage when successfully Login
          let syncCartItems: CartAddOrUpdate[] = [];
          this.cartItem$.subscribe((items) => {
            items.filter((item) => {
              if (item) {
                const params: CartAddOrUpdate = {
                  id: null,
                  product: item?.product,
                  product_id: item?.product_id,
                  variation: item?.variation ? item.variation : null,
                  variation_id: item?.variation_id ? item.variation_id : null,
                  quantity: item.quantity,
                };
                syncCartItems.push(params);
              }
            });
          });
          if (syncCartItems.length) {
            this.store.dispatch(new SyncCart(syncCartItems));
          } else {
            this.store.dispatch(new GetCartItems());
          }

          this.authService.redirectUrl = undefined;
        },
      });
    }
  }

  loginWithNumber() {
    this.activeForm.emit('withNumber');
  }

  action(action: string) {
    this.activeForm.emit(action);
  }
}
