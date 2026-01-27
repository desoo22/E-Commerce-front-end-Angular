import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OrderItem {
  productId: number;
  productName?: string;
  quantity: number;
  price: number;
  unitPrice?: number;
}

export interface Order {
  id: number;
  userId: number;
  totalPrice: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
  shippingAddress?: string;
  city?: string;
  phoneNumber?: string;
  fullName?: string;
  totalQuantity?: number;
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
  getUserOrders(): Observable<Order[]> {
    return this.apiService.get<Order[]>('user/orders');
  }

  // Get order by ID
  getOrderById(orderId: number): Observable<Order> {
    return this.apiService.get<Order>(`order/${orderId}`);
  }

  // Update order status (Admin/Owner only)
  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.apiService.put(`order/status/${orderId}`, { status });
  }

  // Cancel order (Admin/Owner only)
  cancelOrder(orderId: number): Observable<any> {
    return this.apiService.put(`order/cancel/${orderId}`, {});
  }

  // Delete order (Admin/Owner only)
  deleteOrder(orderId: number): Observable<any> {
    return this.apiService.delete(`order/${orderId}`);
  }
}
