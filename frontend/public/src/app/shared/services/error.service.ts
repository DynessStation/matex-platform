import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  constructor() {}

  getClientErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return navigator.onLine ? 'Service is temporarily unavailable' : 'No Internet Connection';
    }

    return typeof error.error?.message === 'string'
      ? error.error.message
      : error.message || 'Something Went Wrong';
  }

  getServerErrorMessage(error: HttpErrorResponse): string {
    return error.message;
  }
}
