import { AsyncPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

import { TranslateModule } from "@ngx-translate/core";
import { Store } from "@ngxs/store";
import { Observable } from "rxjs";

import { Alert } from "../../../shared/components/ui/alert/alert";
import { Button } from "../../../shared/components/ui/button/button";
import { IValues } from "../../../shared/interface/setting.interface";
import { LoginAction } from "../../../shared/store/action/auth.action";
import { SettingState } from "../../../shared/store/state/setting.state";

@Component({
  selector: "app-login",
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    Alert,
    Button,
    AsyncPipe,
  ],
  templateUrl: "./login.html",
  styleUrl: "./login.scss",
})
export class Login {
  private store = inject(Store);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  public showPassword = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  setting$: Observable<IValues> = this.store.select(
    SettingState.setting,
  ) as Observable<IValues>;

  public form = this.formBuilder.group({
    identity: ["", Validators.required],
    password: ["", Validators.required],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.store.dispatch(new LoginAction(this.form.getRawValue())).subscribe({
      complete: () => {
        void this.router.navigateByUrl("/dashboard");
      },
    });
  }
}
