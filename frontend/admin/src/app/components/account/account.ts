import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, finalize } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { FormFields } from '../../shared/components/ui/form-fields/form-fields';
import { ImagePreviewDirective } from '../../shared/directives/image-preview.directive';
import { TextFitDirective } from '../../shared/directives/text-fit.directive';
import { IAuthResponse } from '../../shared/interface/auth.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ProfileService } from '../../shared/services/profile.service';
import { UpdateAuthUserAction } from '../../shared/store/action/auth.action';
import { AuthState } from '../../shared/store/state/auth.state';

// The same rules as the API (admin-account input): letters and . , ' - for names,
// "+" and 7-15 digits for phones, 8-64 characters with a non-letter for passwords.
const NAME = /^[\p{L}\s.,'-]+$/u;
const PHONE = /^\+[1-9]\d{6,14}$/;
const PASSWORD = /^(?=.*[^a-zA-Z])\S{8,64}$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;

  const confirmation = group.get('password_confirmation')?.value;

  return confirmation && password !== confirmation ? { mismatch: true } : null;
}

// "Profil saya" (U-16): the signed-in admin's photo, name, and backup contacts, and a
// password change that signs out other devices. Login identities, office, position, and
// access profile are shown only; they change through Akun Admin.
@Component({
  selector: 'app-account',
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    PageWrapper,
    FormFields,
    Button,
    ImagePreviewDirective,
    TextFitDirective,
  ],
  templateUrl: './account.html',
})
export class Account {
  private readonly store = inject(Store);
  private readonly profiles = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  private readonly apiMessages = inject(ApiMessageService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly user = toSignal(this.store.select(AuthState.user));

  private readonly photoInput =
    viewChild<ElementRef<HTMLInputElement>>('photoInput');

  readonly profileForm = this.formBuilder.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.maxLength(50), Validators.pattern(NAME)],
    ],
    email_2: ['', [Validators.email]],
    phone_2: ['', [Validators.pattern(PHONE)]],
  });

  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      current_password: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD)]],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly savingProfile = signal(false);

  readonly savingPassword = signal(false);

  readonly photoBusy = signal(false);

  readonly showPassword = signal<Record<string, boolean>>({});

  constructor() {
    // The form shows the account until the admin starts editing it.
    effect(() => {
      const user = this.user();

      if (user && this.profileForm.pristine) {
        this.profileForm.reset({
          name: user.name ?? '',
          email_2: user.email_2 ?? '',
          phone_2: user.phone_2 ?? '',
        });
      }
    });
  }

  initial(): string {
    return (this.user()?.name ?? '?').trim().charAt(0).toUpperCase();
  }

  togglePassword(field: string): void {
    this.showPassword.update((shown) => ({ ...shown, [field]: !shown[field] }));
  }

  //==================================================
  //==== NAME AND BACKUP CONTACTS
  //==================================================

  saveProfile(): void {
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid || this.savingProfile()) {
      return;
    }

    const value = this.profileForm.getRawValue();

    this.savingProfile.set(true);

    this.applyAccount(
      this.profiles.updateProfile({
        name: value.name.trim(),
        email_2: value.email_2.trim() || null,
        phone_2: value.phone_2.trim() || null,
      }),
      () => this.savingProfile.set(false),
      () => this.profileForm.markAsPristine(),
    );
  }

  //==================================================
  //==== PHOTO
  //==================================================

  choosePhoto(): void {
    this.photoInput()?.nativeElement.click();
  }

  onPhotoChosen(event: Event): void {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    input.value = '';

    if (!file || this.photoBusy()) {
      return;
    }

    this.photoBusy.set(true);

    this.applyAccount(this.profiles.uploadPhoto(file), () =>
      this.photoBusy.set(false),
    );
  }

  removePhoto(): void {
    if (this.photoBusy()) {
      return;
    }

    this.photoBusy.set(true);

    this.applyAccount(this.profiles.removePhoto(), () =>
      this.photoBusy.set(false),
    );
  }

  //==================================================
  //==== PASSWORD
  //==================================================

  changePassword(): void {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || this.savingPassword()) {
      return;
    }

    this.savingPassword.set(true);

    this.profiles
      .changePassword(this.passwordForm.getRawValue())
      .pipe(
        finalize(() => this.savingPassword.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.passwordForm.reset();

        this.showPassword.set({});

        this.notifications.showSuccess(
          this.translate.instant('profile.password_changed'),
        );
      });
  }

  //==================================================
  //==== SAVED ACCOUNT
  //==================================================

  // Errors are shown by the global error interceptor.
  private applyAccount(
    request: Observable<IAuthResponse>,
    done: () => void,
    saved?: () => void,
  ): void {
    request
      .pipe(finalize(done), takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.store.dispatch(new UpdateAuthUserAction(response.data));

        saved?.();

        this.notifications.showSuccess(
          this.apiMessages.resolve(response.code, response.message),
        );
      });
  }
}
