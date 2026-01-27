import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../core/services/order.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent implements OnInit {
  expandedOrderId: number | null = null;
  private orderService = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);
  
  orders: Order[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  toggleExpand(orderId: number) {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;
    this.orderService.getAllOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error loading orders:', err);
        this.error = 'Failed to load orders';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateStatus(orderId: number, newStatus: string): void {
    if (!confirm(`Are you sure you want to change order status to "${newStatus}"?`)) {
      return;
    }

    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        console.log('✅ Order status updated');
        this.success = `Order #${orderId} status updated to ${newStatus}`;
        setTimeout(() => this.success = null, 3000);
        this.loadOrders();
      },
      error: (err) => {
        console.error('❌ Error updating status:', err);
        this.error = err.error?.message || 'Failed to update order status';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  getTotalItems(order: Order): number {
    return order.itemCount || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') return 'status-delivered';
    if (statusLower === 'shipped') return 'status-shipped';
    if (statusLower.includes('pending')) return 'status-pending';
    if (statusLower === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }

  getRowClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'cancelled') return 'row-cancelled';
    if (statusLower === 'delivered') return 'row-delivered';
    return '';
  }
}
