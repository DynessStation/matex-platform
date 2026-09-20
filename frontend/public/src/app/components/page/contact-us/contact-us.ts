import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Store } from '@ngxs/store';
import { Select2 } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Contact, Option } from '../../../shared/interface/theme-option.interface';
import { ContactUsAction } from '../../../shared/store/action/page.action';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-contact-us',
  imports: [HomeNewsletter, FormsModule, ReactiveFormsModule, Select2, Breadcrumb],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
})
export class ContactUs {
  private formBuilder = inject(FormBuilder);
  private store = inject(Store);

  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: 'Contact us',
    items: [{ label: 'Contact us', active: true }],
  };

  public form: FormGroup;
  public contactData: Contact;

  constructor() {
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [Validators.required]),
      message: new FormControl('', [Validators.required]),
      select_topic: new FormControl('', [Validators.required]),
    });

    this.themeOption$.subscribe((data) => (this.contactData = data?.contact_us));
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.store.dispatch(new ContactUsAction(this.form.value)).subscribe({
        complete: () => {
          this.form.reset();
        },
      });
    }
  }
}
