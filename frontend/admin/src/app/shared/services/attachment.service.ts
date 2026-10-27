import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';
import {
  IAttachment,
  IAttachmentListResponse,
  IAttachmentModel,
  ICreateAttachmentPayload,
  ICreateAttachmentResponse,
  IDeleteAllAttachmentResponse,
  IDeleteAttachmentResponse,
} from '../interface/attachment.interface';
import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private http = inject(HttpClient);

  //==================================================
  //==== GET ATTACHMENTS
  //==================================================

  getAttachments(payload?: Params): Observable<IAttachmentModel> {
    const params = listParams(payload);

    return this.http
      .get<IAttachmentListResponse>(
        `${environment.API_URL}/api/v1/attachment`,
        {
          params,

          context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
        },
      )
      .pipe(
        map((response): IAttachmentModel => ({
          data: response.data.map((item) => this.normalizeAttachment(item)),

          total: response.meta.total,

          current_page: response.meta.page,

          per_page: response.meta.limit,

          last_page: response.meta.total_pages,

          from: response.meta.total
            ? (response.meta.page - 1) * response.meta.limit + 1
            : 0,

          to: response.meta.total
            ? (response.meta.page - 1) * response.meta.limit +
              response.data.length
            : 0,
        })),
      );
  }

  //==================================================
  //==== CREATE ATTACHMENT
  //==================================================

  createAttachment(
    payload: ICreateAttachmentPayload,
  ): Observable<ICreateAttachmentResponse> {
    const formData = new FormData();

    //==================================================
    //==== COLLECTION
    //==================================================

    formData.append('collection', payload.collection);

    //==================================================
    //==== FILES
    //==================================================

    payload.files.forEach((file) => {
      formData.append('files', file, file.name);
    });

    //==================================================
    //==== REQUEST
    //==================================================

    return this.http
      .post<ICreateAttachmentResponse>(
        `${environment.API_URL}/api/v1/attachment`,
        formData,
      )
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => this.normalizeAttachment(item)),
        })),
      );
  }

  //==================================================
  //==== NORMALIZE ATTACHMENT
  //==================================================

  private normalizeAttachment(item: IAttachment): IAttachment {
    return {
      ...item,

      //==================================================
      //==== LEGACY TEMPLATE ALIAS
      //==================================================

      id: item.id_attachment,

      original_url: item.asset_url,

      size: item.file_size,
    };
  }

  //==================================================
  //==== DELETE ATTACHMENT
  //==================================================

  deleteAttachment(id: string): Observable<IDeleteAttachmentResponse> {
    return this.http.delete<IDeleteAttachmentResponse>(
      `${environment.API_URL}/api/v1/attachment/${id}`,
    );
  }

  //==================================================
  //==== BULK DELETE ATTACHMENT
  //==================================================

  deleteAttachments(ids: string[]): Observable<IDeleteAllAttachmentResponse> {
    return this.http.post<IDeleteAllAttachmentResponse>(
      `${environment.API_URL}/api/v1/attachment/bulk-delete`,
      {
        ids,
      },
    );
  }
}
