import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService, CartDto, CheckOutDto } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cart: CartDto | null = null;
  checkoutForm!: FormGroup;
  loading = false;
  checkingOut = false;
  error: string | null = null;
  success: string | null = null;
  removingItem: number | null = null;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('🔍 Cart Component Init');
    
    // Set loading to false immediately and show empty cart
    this.loading = false;
    this.cart = { items: [], totalPrice: 0, totalQuantity: 0 };
    
    // Then load the actual cart data
    this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('✅ Cart loaded:', cart);
        this.cart = cart;
      },
      error: (err) => {
        console.error('❌ Cart error:', err);
        this.error = 'Failed to load cart';
      }
    });
  }

  private initializeForm(): void {
    this.checkoutForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      city: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      apartment: ['', Validators.required]
    });
  }

  removeItem(item: any): void {
    this.removingItem = item.variantId ?? item.productId;
    this.cartService.removeItem({
      productId: item.productId,
      variantId: item.variantId ?? item.productId,
      productName: item.productName || '',
      quantity: 1,
      price: item.price
    }).subscribe({
      next: () => {
        this.removingItem = null;
        this.loadCart(); // Call to loadCart method
      },
      error: (err) => {
        this.removingItem = null;
        this.error = 'Failed to remove product';
      }
    });
  }

  private loadCart(): void {
    this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('✅ Cart loaded:', cart);
        this.cart = cart;
      },
      error: (err) => {
        console.error('❌ Cart error:', err);
        this.error = 'Failed to load cart';
      }
    });
  }

  checkout(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    if (this.checkoutForm.invalid || !this.cart || !this.cart.items.length) {
      this.error = 'Please fill all fields and ensure cart is not empty';
      return;
    }

    this.checkingOut = true;
    this.error = null;
    this.success = null;

    const dto: CheckOutDto = {
      email: this.checkoutForm.get('email')?.value,
      fullName: this.checkoutForm.get('fullName')?.value,
      phoneNumber: this.checkoutForm.get('phoneNumber')?.value,
      city: this.checkoutForm.get('city')?.value,
      street: this.checkoutForm.get('street')?.value,
      building: this.checkoutForm.get('building')?.value,
      apartment: this.checkoutForm.get('apartment')?.value
    };

    this.cartService.checkout(dto).subscribe({
      next: (response) => {
        console.log('✅ Checkout success:', response);
        this.checkingOut = false;
        this.success = 'Order placed successfully! ✅';
        
        if (response && response.paymentUrl) {
          setTimeout(() => {
            window.location.href = response.paymentUrl;
          }, 1500);
        } else {
          setTimeout(() => {
            this.router.navigate(['/orders']);
          }, 2000);
        }
      },
      error: (err) => {
        console.error('❌ Checkout error:', err);
        this.checkingOut = false;
        this.error = err.error?.message || 'Failed to complete checkout';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  proceedToCheckout(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
  }
}