import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WishlistModel } from '../interface/wishlist.interface';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private http = inject(HttpClient);

  public skeletonLoader: boolean = false;

  getWishlistItems(): Observable<WishlistModel> {
    return this.http.get<WishlistModel>(`${environment.URL}/wishlist.json`);
  }
}
