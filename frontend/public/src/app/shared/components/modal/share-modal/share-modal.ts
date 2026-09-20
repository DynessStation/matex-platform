import { Component, inject, Input, input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { environment } from '../../../../../environments/environment';
import { Product } from '../../../interface/product.interface';
import { Option } from '../../../interface/theme-option.interface';
import { Button } from '../../button/button';

export interface ShareOption {
  id: string;
  name: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-share-modal',
  imports: [NgbModule, FormsModule, Button, ReactiveFormsModule],
  templateUrl: './share-modal.html',
  styleUrl: './share-modal.scss',
})
export class ShareModal {
  @Input() product: Product;
  readonly option = input<Option | null>();

  public url: string = environment.baseURL;
  public shareText: string = '';
  public active: number = 1;

  public modalService = inject(NgbModal);

  ngOnInit() {
    if (this.product) {
      this.shareOnFacebook(this.product!.slug);
    }
  }

  shareOnFacebook(slug: string) {
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url + '/product/' + slug)}`;
    this.shareText = facebookShareUrl;
    this.active = 1;
  }

  shareOnTwitter(slug: string) {
    const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.url + '/product/' + slug)}`;
    this.shareText = twitterShareUrl;
    this.active = 2;
  }

  shareOnLinkedIn(slug: string) {
    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.url + '/product/' + slug)}`;
    this.shareText = linkedInShareUrl;
    this.active = 3;
  }

  shareOnWhatsApp(slug: string) {
    const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(this.url + '/product/' + slug)}`;
    this.shareText = whatsappShareUrl;
    this.active = 4;
  }

  shareViaEmail(slug: string) {
    const subject = 'Check out this awesome product!';
    const body = `I thought you might be interested in this product: ${this.url + '/product/' + slug}`;
    const emailShareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailShareUrl; // Use location.href to open the default email client
    console.warn(
      '🚀 ~ ProductSocialShareComponent ~ shareViaEmail ~ emailShareUrl:',
      this.url,
      emailShareUrl,
    );
  }

  copyLink() {
    void navigator.clipboard.writeText(this.shareText);
  }
}
