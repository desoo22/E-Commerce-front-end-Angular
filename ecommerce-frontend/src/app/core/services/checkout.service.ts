import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CheckOutDto {
  email: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  street: string;
  building: string;
  apartment: string;
  neighborhood: string;
}

export interface CheckoutResponse {
  orderId: number;
  paymentUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  constructor(private apiService: ApiService) {}

  // ========================= Checkout =========================
  
  // Main checkout endpoint (from CheckOutController)
  checkout(dto: CheckOutDto): Observable<CheckoutResponse> {
    return this.apiService.post<CheckoutResponse>('checkout', dto);
  }

  // Cart checkout endpoint (alternative)
  cartCheckout(dto: CheckOutDto): Observable<any> {
    return this.apiService.post('cart/checkout', dto);
  }
}
