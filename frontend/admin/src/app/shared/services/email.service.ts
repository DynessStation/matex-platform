import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  IEmailDraft,
  IEmailFolder,
  IEmailMailboxes,
  IEmailMessage,
  IEmailMessagesResponse,
} from '../interface/email.interface';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/email`;

  private box(mailbox: string) {
    return `${this.apiUrl}/${encodeURIComponent(mailbox)}`;
  }

  getMailboxes() {
    return this.http.get<IApiResponse<IEmailMailboxes>>(
      `${this.apiUrl}/mailboxes`,
    );
  }

  getFolders(mailbox: string) {
    return this.http.get<IApiResponse<IEmailFolder[]>>(
      `${this.box(mailbox)}/folders`,
    );
  }

  getMessages(mailbox: string, folder: string, page: number, search: string) {
    return this.http.get<IEmailMessagesResponse>(
      `${this.box(mailbox)}/messages`,
      { params: { folder, page, ...(search ? { search } : {}) } },
    );
  }

  getMessage(mailbox: string, folder: string, uid: number) {
    return this.http.get<IApiResponse<IEmailMessage>>(
      `${this.box(mailbox)}/messages/${uid}`,
      { params: { folder } },
    );
  }

  setSeen(mailbox: string, folder: string, uid: number, seen: boolean) {
    return this.http.patch<IApiResponse<unknown>>(
      `${this.box(mailbox)}/messages/${uid}/seen`,
      { folder, seen },
    );
  }

  trash(mailbox: string, folder: string, uid: number) {
    return this.http.post<IApiResponse<unknown>>(
      `${this.box(mailbox)}/messages/${uid}/trash`,
      { folder },
    );
  }

  download(
    mailbox: string,
    folder: string,
    uid: number,
    attachment: string,
    name: string,
  ) {
    return this.http.get(
      `${this.box(mailbox)}/messages/${uid}/attachments/${encodeURIComponent(attachment)}`,
      { params: { folder, name }, responseType: 'blob' },
    );
  }

  send(mailbox: string, draft: IEmailDraft) {
    return this.http.post<IApiResponse<unknown>>(
      `${this.box(mailbox)}/send`,
      draft,
    );
  }
}
