import {
  Component,
  Input,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

import { environment } from '../../../../../environments/environment.development';

import { IAttachment } from '../../../interface/attachment.interface';

import { MediaModal } from '../modal/media-modal/media-modal';

import { MediaSelection } from '../media-box/media-box';

import { HasPermissionDirective } from '../../../directive/has-permission.directive';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-image-upload',

  imports: [MediaModal, HasPermissionDirective],

  templateUrl: './image-upload.html',

  styleUrl: './image-upload.scss',
})
export class ImageUpload {
  //==================================================
  //==== VIEW CHILD
  //==================================================

  readonly MediaModal = viewChild<MediaModal>('mediaModal');

  //==================================================
  //==== INPUT
  //==================================================

  readonly id = input<string>('');

  readonly url = input<boolean>(false);

  readonly multipleImage = input<boolean>(false);

  readonly helpText = input<string>('');

  //==================================================
  //==== ACCEPT
  //==================================================

  readonly accept = input<any>([]);

  readonly acceptList = computed<string[]>(() => {
    const value = this.accept();

    //==================================================
    //==== EMPTY
    //==================================================

    if (!value) {
      return [];
    }

    //==================================================
    //==== ARRAY
    //==================================================

    if (Array.isArray(value)) {
      return value
        .flat(Infinity)
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    //==================================================
    //==== STRING
    //==================================================

    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  });

  //==================================================
  //==== ATTACHMENT COLLECTION
  //==================================================

  readonly collection = input<string>('');

  //==================================================
  //==== LEGACY INPUT
  //==================================================

  @Input()
  images: IAttachment[] = [];

  @Input()
  image: IAttachment | null = null;

  @Input()
  imageUrl: string | null = null;

  //==================================================
  //==== OUTPUT
  //==================================================

  /**
   * Keep `any` temporarily because many
   * Kartify components still consume this output
   * using the old attachment contract.
   */
  readonly selectedFiles = output<any>();

  //==================================================
  //==== DISPLAY DATA
  //==================================================

  public showImages: IAttachment[] = [];

  public showImage: IAttachment | null = null;

  public showImageUrl: string | null = null;

  public selected: any;

  public videoType = ['mp4', 'webm', 'ogg'];

  //==================================================
  //==== MIME FALLBACK ICON
  //==================================================

  public mimeImageMapping: {
    mimeType: string;

    imagePath: string;
  }[] = [
    {
      mimeType: 'application/pdf',

      imagePath: 'assets/images/pdf.png',
    },
    {
      mimeType: 'application/msword',

      imagePath: 'assets/images/word.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      imagePath: 'assets/images/word.png',
    },
    {
      mimeType: 'application/vnd.ms-excel',

      imagePath: 'assets/images/xls.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      imagePath: 'assets/images/xls.png',
    },
    {
      mimeType: 'application/vnd.ms-powerpoint',

      imagePath: 'assets/images/folder.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      imagePath: 'assets/images/folder.png',
    },
    {
      mimeType: 'text/plain',

      imagePath: 'assets/images/txt.png',
    },
    {
      mimeType: 'audio/mpeg',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'audio/wav',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'audio/ogg',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'video/mp4',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'video/webm',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'video/ogg',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'application/zip',

      imagePath: 'assets/images/zip.png',
    },
    {
      mimeType: 'application/x-tar',

      imagePath: 'assets/images/zip.png',
    },
    {
      mimeType: 'application/gzip',

      imagePath: 'assets/images/zip.png',
    },
  ];

  //==================================================
  //==== CHANGES
  //==================================================

  ngOnChanges() {
    this.showImage = this.image;

    this.showImages = this.images ?? [];

    this.showImageUrl = this.imageUrl;
  }

  //==================================================
  //==== SELECT IMAGE
  //==================================================

  selectImage(data: MediaSelection): void {
    //==================================================
    //==== EMPTY
    //==================================================

    if (!data) {
      this.clearSelection();

      this.selectedFiles.emit(null);

      return;
    }

    //==================================================
    //==== ARRAY
    //==================================================

    if (Array.isArray(data)) {
      //==================================================
      //==== ATTACHMENT ARRAY
      //==================================================

      const attachments = data.filter(
        (item): item is IAttachment => typeof item !== 'string',
      );

      if (attachments.length) {
        this.images = [...attachments];

        this.showImages = [...attachments];

        this.image = null;

        this.showImage = null;

        this.imageUrl = null;

        this.showImageUrl = null;

        this.selectedFiles.emit(attachments);

        return;
      }

      //==================================================
      //==== URL ARRAY
      //==================================================

      const urls = data.filter(
        (item): item is string => typeof item === 'string',
      );

      if (urls.length) {
        this.images = [];

        this.showImages = [];

        this.image = null;

        this.showImage = null;

        this.imageUrl = urls[0];

        this.showImageUrl = urls[0];

        this.selectedFiles.emit(urls);

        return;
      }

      //==================================================
      //==== EMPTY ARRAY
      //==================================================

      this.clearSelection();

      this.selectedFiles.emit(null);

      return;
    }

    //==================================================
    //==== URL
    //==================================================

    if (typeof data === 'string') {
      this.images = [];

      this.showImages = [];

      this.image = null;

      this.showImage = null;

      this.imageUrl = data;

      this.showImageUrl = data;

      this.selectedFiles.emit(data);

      return;
    }

    //==================================================
    //==== SINGLE ATTACHMENT
    //==================================================

    this.images = [];

    this.showImages = [];

    this.imageUrl = null;

    this.showImageUrl = null;

    this.image = data;

    this.showImage = data;

    this.selectedFiles.emit(data);
  }

  //==================================================
  //==== REMOVE
  //==================================================

  remove(
    index: number,

    type: string,
  ): void {
    //==================================================
    //==== MULTIPLE
    //==================================================

    if (type === 'multiple') {
      this.images = this.images.filter(
        (_item, itemIndex) => itemIndex !== index,
      );

      this.showImages = [...this.images];

      this.selectedFiles.emit(this.images);

      return;
    }

    //==================================================
    //==== SINGLE URL
    //==================================================

    if (type === 'single_image_url') {
      this.imageUrl = null;

      this.showImageUrl = null;

      this.selectedFiles.emit(null);

      return;
    }

    //==================================================
    //==== SINGLE ATTACHMENT
    //==================================================

    this.image = null;

    this.showImage = null;

    this.selectedFiles.emit(null);
  }

  //==================================================
  //==== CLEAR SELECTION
  //==================================================

  private clearSelection(): void {
    this.images = [];

    this.showImages = [];

    this.image = null;

    this.showImage = null;

    this.imageUrl = null;

    this.showImageUrl = null;
  }

  //==================================================
  //==== RESOLVE MEDIA URL
  //==================================================

  resolveMediaUrl(value: string | null): string {
    if (!value) {
      return '';
    }

    const cleanValue = String(value).trim();

    //==================================================
    //==== ABSOLUTE URL
    //==================================================

    if (
      cleanValue.startsWith('http://') ||
      cleanValue.startsWith('https://') ||
      cleanValue.startsWith('data:') ||
      cleanValue.startsWith('blob:')
    ) {
      return cleanValue;
    }

    //==================================================
    //==== LEGACY RELATIVE URL
    //==================================================

    const baseUrl = String(environment.URL ?? '').replace(/\/+$/, '');

    const relativeUrl = cleanValue.startsWith('/')
      ? cleanValue
      : `/${cleanValue}`;

    return `${baseUrl}${relativeUrl}`;
  }

  //==================================================
  //==== VIDEO URL
  //==================================================

  isVideoUrl(value: string): boolean {
    const cleanUrl = value.split('?')[0].split('#')[0];

    const extension = cleanUrl
      .substring(cleanUrl.lastIndexOf('.') + 1)
      .toLowerCase();

    return this.videoType.includes(extension);
  }

  //==================================================
  //==== MIME ICON
  //==================================================

  getMimeTypeImage(mimeType: string) {
    return this.mimeImageMapping.find((value) => value.mimeType === mimeType)
      ?.imagePath;
  }
}
