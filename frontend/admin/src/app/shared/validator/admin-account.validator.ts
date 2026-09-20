import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export class AdminAccountValidator {
  /**
   * Name:
   * - Unicode letters
   * - Space
   * - Dot
   * - Comma
   * - Apostrophe
   * - Hyphen
   * - No numbers / other symbols
   */
  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? "").trim();

      if (!value) {
        return null;
      }

      const valid = /^[\p{L}\s.,'-]+$/u.test(value);

      return valid
        ? null
        : {
            invalidName: true,
          };
    };
  }

  /**
   * Alias:
   * letters + numbers only.
   * No spaces / symbols.
   */
  static alias(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? "");

      if (!value) {
        return null;
      }

      return /^[a-zA-Z0-9]+$/.test(value)
        ? null
        : {
            invalidAlias: true,
          };
    };
  }

  /**
   * Local phone:
   * - digits only
   * - must not start with 0
   */
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? "");

      if (!value) {
        return null;
      }

      if (!/^\d+$/.test(value)) {
        return {
          invalidPhone: true,
        };
      }

      if (value.startsWith("0")) {
        return {
          phoneStartsWithZero: true,
        };
      }

      return null;
    };
  }

  /**
   * Password:
   * - no whitespace
   * - at least one non-letter character
   *
   * Length handled with Angular Validators.
   */
  static password(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? "");

      if (!value) {
        return null;
      }

      if (/\s/.test(value)) {
        return {
          passwordHasSpace: true,
        };
      }

      if (!/[^\p{L}]/u.test(value)) {
        return {
          passwordRequiresNonLetter: true,
        };
      }

      return null;
    };
  }

  static passwordMatch(
    passwordField = "password",
    confirmField = "confirm_password",
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField)?.value;

      const confirmation = control.get(confirmField)?.value;

      if (!password || !confirmation) {
        return null;
      }

      return password === confirmation
        ? null
        : {
            passwordMismatch: true,
          };
    };
  }
}
