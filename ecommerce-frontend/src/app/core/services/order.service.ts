import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  userId: number;
  totalPrice: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
  shippingAddress: string;
  city: string;
  phoneNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private apiService: ApiService) {}

  // Get all orders (Admin only)
  getAllOrders(): Observable<Order[]> {
    return this.apiService.get<Order[]>('order');
  }

  // Get user's orders
  getUserOrders(userId: number): Observable<any> {
  return this.apiService.get<any>(`user/orders`); 
}

  // Update order status (Admin only)
  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.apiService.put(`order/status?orderId=${orderId}&status=${status}`, {});
  }
}
