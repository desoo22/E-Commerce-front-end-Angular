import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PaymentSuccessDto {
  orderId: number;
  secret: string;
}

export interface PaymentFailDto {
  orderId: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  // ========================= Payment Success =========================
  
  // Mark payment as successful
  paymentSuccess(orderId: number, secret: string): Observable<any> {
    return this.apiService.post('payment/success', {
      orderId,
      secret
    });
  }

  // ========================= Payment Fail =========================
  
  // Mark payment as failed
  paymentFail(orderId: number): Observable<any> {
    return this.apiService.post('payment/fail', {
      orderId
    });
  }
}
