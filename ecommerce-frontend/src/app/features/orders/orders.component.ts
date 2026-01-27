import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  error = '';
  expandedOrderId: number | null = null;

  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit(): void {
    console.log('🔍 Orders Component Init');
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading = true;
    this.orders = [];
    
    // Check user role to determine which endpoint to use
    const userRole = this.authService.getUserRole();
    const isAdminOrOwner = userRole === 'Admin' || userRole === 'Owner';
    
    console.log(`🔍 Loading orders, Role: ${userRole}`);
    
    // Admin/Owner: get all orders, User: get only their orders
    const ordersObservable = isAdminOrOwner 
      ? this.orderService.getAllOrders() 
      : this.orderService.getUserOrders();
    
    ordersObservable.subscribe({
      next: (data: Order[]) => {
        console.log('✅ Orders response:', data);
        
        // Calculate total quantity for each order
        this.orders = data.map(order => ({
          ...order,
          totalQuantity: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        }));
        
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('❌ Orders error:', err);
        
        if (err.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/orders' } });
          return;
        }
        
        this.error = 'Failed to load orders. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleExpand(orderId: number): void {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  getTotalItems(order: Order): number {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') return 'status-delivered';
    if (statusLower === 'shipped') return 'status-shipped';
    if (statusLower === 'processing') return 'status-processing';
    if (statusLower === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }

  refreshOrders(): void {
    this.loadOrders();
  }
}
