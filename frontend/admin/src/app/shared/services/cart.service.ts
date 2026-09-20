import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { ICartModel } from '../interface/cart.interface';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);

  getCartItems(): Observable<ICartModel> {
    return this.http.get<ICartModel>(`${environment.URL}/cart.json`);
  }
}
