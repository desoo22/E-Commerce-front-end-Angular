import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';

interface OrderItem {
  productVariantId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface UserOrderDto {
  items: OrderItem[];
  totalPrice: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  loading = true;
  error = '';

  private apiService = inject(ApiService);
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
    
    // Admin/Owner: get all orders, User: get only their orders
    const endpoint = isAdminOrOwner ? 'order' : 'user/orders';
    
    console.log(`🔍 Loading orders from: ${endpoint}, Role: ${userRole}`);
    
    // Load the actual orders data
    this.apiService.get<any>(endpoint).subscribe({
      next: (data: any) => {
        console.log('✅ Orders response:', data);
        
        // Handle different response formats
        if (data && Array.isArray(data)) {
          // If data is already an array
          this.orders = data;
        } else if (data && data.items && Array.isArray(data.items)) {
          // If data has items property
          this.orders = data.items;
        } else {
          this.orders = [];
        }
        
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
  }
