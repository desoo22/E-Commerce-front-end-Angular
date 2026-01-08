import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  orderData: UserOrderDto | null = null;
  loading = true;
  error = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔍 Orders Component Init');
    
    // Set loading to false immediately and show empty orders
    this.loading = false;
    this.orderData = null;
    
    // Then load the actual orders data
    this.apiService.get<any>('user/orders').subscribe({
      next: (data) => {
        console.log('✅ Orders response:', data);
        
        if (data && data.items && Array.isArray(data.items)) {
          this.orderData = {
            items: data.items.map((item: any) => ({
              productVariantId: item.productVariantId || item.ProductVariantId || 0,
              productName: item.productName || item.ProductName || 'Product',
              quantity: item.quantity || item.Quantity || 0,
              unitPrice: item.unitPrice || item.UnitPrice || 0
            })),
            totalPrice: data.totalPrice || data.TotalPrice || 0
          };
        } else {
          this.orderData = null;
        }
      },
      error: (err) => {
        console.error('❌ Orders error:', err);
        
        if (err.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/orders' } });
          return;
        }
        
        this.error = 'Failed to load orders. Please try again.';
      }
    });
  }
}