import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';

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

import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';

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
    let params = new HttpParams();

    //==================================================
    //==== PARAMS
    //==================================================

    if (payload) {
      const mappedParams: Record<string, any> = {
        page: payload['page'],

        limit: payload['paginate'] ?? payload['limit'],

        search: payload['search'],

        collection: payload['collection'],

        mime_type: payload['mime_type'],

        sort: payload['sort'],
      };

      Object.entries(mappedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    //==================================================
    //==== REQUEST
    //==================================================

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

          total: response.pagination.total,

          current_page: response.pagination.page,

          per_page: response.pagination.limit,

          last_page: response.pagination.total_pages,

          from: response.pagination.total
            ? (response.pagination.page - 1) * response.pagination.limit + 1
            : 0,

          to: response.pagination.total
            ? (response.pagination.page - 1) * response.pagination.limit +
              response.pagination.length
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
      //==== KARTIFY LEGACY ALIAS
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
