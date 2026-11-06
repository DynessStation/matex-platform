import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import {
  addressFull,
  addressList,
  addressText,
  folderKey,
  forwardSubject,
  hasRemoteImages,
  mailDocument,
  quotedBody,
  replySubject,
} from './email.util';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import {
  IEmailDraft,
  IEmailFolder,
  IEmailMailboxes,
  IEmailMessage,
  IEmailSummary,
} from '../../shared/interface/email.interface';
import { EmailService } from '../../shared/services/email.service';
import { NotificationService } from '../../shared/services/notification.service';

type ComposeMode = 'new' | 'reply' | 'forward';

// Email: folders, the list, and the open message. What is on screen is in the URL
// (?mailbox=&folder=&uid=&search=&page=). The mail itself stays at the provider.
@Component({
  selector: 'app-email',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TranslateModule,
    PageWrapper,
    HasPermissionDirective,
  ],
  templateUrl: './email.html',
})
export class Email {
  private readonly service = inject(EmailService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly addressText = addressText;
  readonly addressFull = addressFull;
  readonly folderKey = folderKey;

  private readonly query = toSignal(this.route.queryParamMap, {
    requireSync: true,
  });

  readonly state = signal<IEmailMailboxes | null>(null);
  readonly failed = signal(false);
  readonly folders = signal<IEmailFolder[]>([]);
  readonly messages = signal<IEmailSummary[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly loadingList = signal(false);
  readonly message = signal<IEmailMessage | null>(null);
  readonly loadingMessage = signal(false);
  readonly allowImages = signal(false);
  readonly composing = signal<ComposeMode | null>(null);
  readonly sending = signal(false);

  readonly mailbox = computed(
    () => this.query().get('mailbox') || this.state()?.mailboxes[0]?.id || '',
  );
  readonly folder = computed(() => this.query().get('folder') || 'INBOX');
  readonly search = computed(() => this.query().get('search') ?? '');
  readonly page = computed(() => Number(this.query().get('page')) || 1);
  readonly uid = computed(() => Number(this.query().get('uid')) || null);

  readonly frame = computed<SafeHtml | null>(() => {
    const message = this.message();
    // The frame's sandbox attribute and the policy in the document are what make this safe.
    return message
      ? this.sanitizer.bypassSecurityTrustHtml(
          mailDocument(message, this.allowImages()),
        )
      : null;
  });
  readonly showImagesOffer = computed(() => {
    const message = this.message();
    return !!message && !this.allowImages() && hasRemoteImages(message.html);
  });
  readonly inTrash = computed(() => {
    const folder = this.folders().find((item) => item.path === this.folder());
    return /trash/i.test(`${folder?.special_use ?? ''} ${this.folder()}`);
  });

  readonly draft = this.fb.group({
    to: ['', Validators.required],
    cc: [''],
    subject: ['', Validators.required],
    text: ['', Validators.required],
  });
  private reference: Pick<IEmailDraft, 'in_reply_to' | 'forward_of'> = {};

  constructor() {
    if (this.browser) this.loadMailboxes();

    effect(() => {
      const mailbox = this.mailbox();
      if (mailbox) untracked(() => this.loadFolders(mailbox));
    });
    effect(() => {
      const mailbox = this.mailbox();
      const folder = this.folder();
      const page = this.page();
      const search = this.search();
      if (mailbox) {
        untracked(() => this.loadList(mailbox, folder, page, search));
      }
    });
    effect(() => {
      const mailbox = this.mailbox();
      const folder = this.folder();
      const uid = this.uid();
      untracked(() => {
        if (mailbox && uid) this.open(mailbox, folder, uid);
        else this.message.set(null);
      });
    });
  }

  //==================================================
  //==== LOADING AND URL
  //==================================================

  private loadMailboxes(): void {
    this.service.getMailboxes().subscribe({
      next: (response) => this.state.set(response.data ?? null),
      error: () => this.failed.set(true),
    });
  }

  private loadFolders(mailbox: string): void {
    this.service
      .getFolders(mailbox)
      .subscribe((response) => this.folders.set(response.data ?? []));
  }

  private loadList(
    mailbox: string,
    folder: string,
    page: number,
    search: string,
  ): void {
    this.loadingList.set(true);
    this.service
      .getMessages(mailbox, folder, page, search)
      .pipe(finalize(() => this.loadingList.set(false)))
      .subscribe((response) => {
        this.messages.set(response.data);
        this.total.set(response.meta.total);
        this.totalPages.set(response.meta.total_pages);
      });
  }

  private open(mailbox: string, folder: string, uid: number): void {
    this.loadingMessage.set(true);
    this.allowImages.set(false);
    this.service
      .getMessage(mailbox, folder, uid)
      .pipe(finalize(() => this.loadingMessage.set(false)))
      .subscribe((response) => {
        const message = response.data ?? null;
        this.message.set(message);
        if (message?.unseen) this.markSeen(message, true);
      });
  }

  private setQuery(params: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  selectMailbox(id: string): void {
    this.setQuery({ mailbox: id, folder: null, uid: null, page: null });
  }

  selectFolder(path: string): void {
    this.setQuery({ folder: path, uid: null, page: null, search: null });
  }

  selectMessage(uid: number): void {
    this.setQuery({ uid });
  }

  onSearch(value: string): void {
    this.setQuery({ search: value.trim() || null, page: null, uid: null });
  }

  goToPage(page: number): void {
    this.setQuery({ page: page > 1 ? page : null, uid: null });
  }

  refresh(): void {
    const mailbox = this.mailbox();
    if (!mailbox) return;
    this.loadFolders(mailbox);
    this.loadList(mailbox, this.folder(), this.page(), this.search());
  }

  //==================================================
  //==== ACTIONS ON A MESSAGE
  //==================================================

  private markSeen(message: IEmailSummary, seen: boolean): void {
    this.service
      .setSeen(this.mailbox(), this.folder(), message.uid, seen)
      .subscribe(() => {
        this.messages.update((items) =>
          items.map((item) =>
            item.uid === message.uid ? { ...item, unseen: !seen } : item,
          ),
        );
        this.loadFolders(this.mailbox());
      });
  }

  markUnread(): void {
    const message = this.message();
    if (!message) return;
    this.markSeen(message, false);
    this.setQuery({ uid: null });
  }

  moveToTrash(): void {
    const message = this.message();
    if (!message) return;
    this.service
      .trash(this.mailbox(), this.folder(), message.uid)
      .subscribe(() => {
        this.notification.showSuccess(
          this.translate.instant('email_page.trashed'),
        );
        this.setQuery({ uid: null });
        this.refresh();
      });
  }

  download(file: IEmailSummary['attachments'][number]): void {
    const message = this.message();
    if (!message || !this.browser) return;
    this.service
      .download(
        this.mailbox(),
        this.folder(),
        message.uid,
        file.id,
        file.filename,
      )
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  //==================================================
  //==== WRITING
  //==================================================

  compose(mode: ComposeMode): void {
    const message = this.message();
    const ref = message ? { uid: message.uid, folder: this.folder() } : null;
    this.reference = {};
    if (mode === 'reply' && message && ref) {
      this.reference = { in_reply_to: ref };
      this.draft.reset({
        to: addressList(
          message.reply_to.length ? message.reply_to : message.from,
        ),
        cc: '',
        subject: replySubject(message.subject),
        text: quotedBody(message),
      });
    } else if (mode === 'forward' && message && ref) {
      this.reference = { forward_of: ref };
      this.draft.reset({
        to: '',
        cc: '',
        subject: forwardSubject(message.subject),
        text: quotedBody(message),
      });
    } else {
      this.draft.reset({ to: '', cc: '', subject: '', text: '' });
    }
    this.composing.set(mode);
  }

  closeCompose(): void {
    this.composing.set(null);
  }

  send(): void {
    this.draft.markAllAsTouched();
    if (this.draft.invalid || this.sending()) return;
    const value = this.draft.getRawValue();
    this.sending.set(true);
    this.service
      .send(this.mailbox(), {
        to: value.to ?? '',
        cc: value.cc || undefined,
        subject: value.subject ?? '',
        text: value.text ?? '',
        ...this.reference,
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe(() => {
        this.notification.showSuccess(
          this.translate.instant('email_page.sent'),
        );
        this.composing.set(null);
        this.refresh();
      });
  }
}
