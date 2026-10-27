import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { finalize } from 'rxjs';

import { ProductAssistField, ProductFormLocale } from './form-product.model';
import { assistFieldType } from './form-product.util';
import { ProductFormService } from './product-form.service';
import { IApiErrorResponse } from '../../../shared/interface/api-response.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Writing help of the product form (Content and SEO tabs): drafts a field, translates the
// Indonesian field to English, or fills a specification value. One request at a time;
// assistingField names the field being filled. Provided by FormProduct.
@Injectable()
export class ProductAssistantService {
  private editor = inject(ProductFormService);
  private contentAssistant = inject(ContentAssistantService);
  private notification = inject(NotificationService);

  assistingField: string | null = null;

  assistSpecificationValue(locale: ProductFormLocale, index: number): void {
    if (this.assistingField) return;
    const target = this.editor.specifications(locale).at(index) as FormGroup;
    const indonesia = this.editor.specifications('id').at(index) as
      FormGroup | undefined;
    const mode = locale === 'en' ? 'translate' : 'generate';
    const sourceValue =
      mode === 'translate'
        ? String(indonesia?.controls['value']?.value || '')
        : String(target.controls['value']?.value || '');
    const fieldKey = `${locale}_specification_${index}`;

    this.assistingField = fieldKey;
    this.contentAssistant
      .assist({
        mode,
        content_type: 'product-specification',
        source_locale: mode === 'translate' ? 'id-ID' : undefined,
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          user_written_product_name: this.editor.form.get(`${locale}_name`)
            ?.value,
          user_written_specification_name:
            target.controls['label']?.value ||
            indonesia?.controls['label']?.value ||
            '',
          sku: this.editor.form.controls.sku.value,
        }),
        fields: { value: sourceValue },
        field_types: { value: 'short_value' },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          target.controls['value'].setValue(fields['value'] || '');
          this.notification.showSuccess(
            locale === 'id'
              ? 'Nilai spesifikasi sudah diisi. Periksa kembali sebelum menyimpan.'
              : 'Specification value filled from Indonesian. Review it before saving.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  assistProductField(locale: ProductFormLocale, field: ProductAssistField) {
    if (this.assistingField) return;
    const value = this.editor.form.getRawValue();
    const controlName = `${locale}_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'product',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          user_written_name: value[`${locale}_name`],
          sku: value.sku,
          product_kind: value.product_kind,
          categories: this.editor.categoryIds,
          unit: value.unit,
          dimensions_mm: {
            length: value.length_mm,
            width: value.width_mm,
            height: value.height_mm,
          },
          weight_grams: value.weight_grams,
          specifications: this.editor.specificationPayload(locale),
        }),
        fields: { [field]: value[controlName] || '' },
        field_types: { [field]: assistFieldType(field) },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.editor.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            locale === 'id'
              ? 'Draf field berhasil dibuat. Periksa kembali sebelum menyimpan.'
              : 'Field draft generated. Review it before saving.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  translateProductField(field: ProductAssistField) {
    if (this.assistingField) return;
    const value = this.editor.form.getRawValue();
    const controlName = `en_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'product',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: { [field]: value[`id_${field}`] || '' },
        field_types: { [field]: assistFieldType(field) },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (translated) => {
          this.editor.form.get(controlName)?.setValue(translated[field] || '');
          this.notification.showSuccess(
            'Field English sudah diterjemahkan. Nama, judul, dan label tetap Anda isi sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  private showAssistantError(error: IApiErrorResponse) {
    const notConfigured =
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED';
    this.notification.showError(
      notConfigured
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan penulisan belum berhasil. Coba lagi sebentar.',
    );
  }
}
