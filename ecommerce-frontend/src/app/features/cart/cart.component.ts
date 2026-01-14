import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CartService, CartDto, CheckOutDto } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  public cart: CartDto = { items: [], totalPrice: 0, totalQuantity: 0 };
  public checkoutForm: FormGroup;
  public loading: boolean = false;
  public checkingOut: boolean = false;
  public error: string | null = null;
  public success: string | null = null;
  public removingItem: number | null = null;
  public updatingQuantity: number | null = null;

  private cartService: CartService = inject(CartService);
  private authService: AuthService = inject(AuthService);
  private fb: FormBuilder = inject(FormBuilder);
  private router: Router = inject(Router);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    this.checkoutForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      city: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      apartment: ['', Validators.required],
      neighborhood: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
    });
  }

  public ngOnInit(): void {
    this.loadCartOnInit();
  }

  private loadCartOnInit(): void {
    console.log('🔍 Cart Component Init');
    this.loading = true;
    this.cart = { items: [], totalPrice: 0, totalQuantity: 0 };

    this.cartService.getCart().subscribe({
      next: (cart: CartDto) => {
        console.log('✅ Cart loaded:', cart);
        this.cart = cart;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('❌ Cart error:', err);
        this.error = 'Failed to load cart';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  public increaseQuantity(item: any): void {
    this.cartService.increaseQuantity(item).subscribe({
      next: (cart) => {
        this.cart = cart;
      },
      error: (err: any) => {
        console.error('Failed to increase quantity:', err);
        this.error = 'Failed to update quantity';
      }
    });
  }

  public decreaseQuantity(item: any): void {
    this.cartService.decreaseQuantity(item).subscribe({
      next: (cart) => {
        this.cart = cart;
      },
      error: (err: any) => {
        console.error('Failed to decrease quantity:', err);
        this.error = 'Failed to update quantity';
      }
    });
  }

  public qtyUp(item: any): void {
    this.increaseQuantity(item);
  }

  public qtyDown(item: any): void {
    this.decreaseQuantity(item);
  }

  public updateQuantityLocal(item: any, newQuantity: number): void {
    if (newQuantity > 0) {
      item.quantity = newQuantity;
      if (this.cart && this.cart.items) {
        this.cart.totalQuantity = this.cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        this.cart.totalPrice = this.cart.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
        this.cart.items = [...this.cart.items];
      }
    }
  }

  public updateTotals(): void {
    if (this.cart && this.cart.items) {
      this.cart.totalQuantity = this.cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      this.cart.totalPrice = this.cart.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      this.cart.items = [...this.cart.items];
    }
  }

  public onDecreaseClick(item: any): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.updateCartTotals();
    } else {
      this.removeItem(item);
    }
  }

  public onIncreaseClick(item: any): void {
    item.quantity++;
    this.updateCartTotals();
  }

  private updateCartTotals(): void {
    if (this.cart && this.cart.items) {
      this.cart.totalQuantity = this.cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      this.cart.totalPrice = this.cart.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
    }
  }

  public removeItem(item: any): void {
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
        this.refreshCart();
      },
      error: (err: any) => {
        this.removingItem = null;
        this.error = 'Failed to remove product';
      }
    });
  }

  public checkout(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.router.navigate(['/checkout']);
  }

  public proceedToCheckout(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.router.navigate(['/checkout']);
  }

  public goBack(): void {
    this.router.navigate(['/products']);
  }

  public isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  public get totalQuantity(): number {
    return this.cart?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
  }

  public get totalPrice(): number {
    return this.cart?.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) ?? 0;
  }

  public canIncreaseQuantity(): boolean {
    return this.cart !== null;
  }

  public canDecreaseQuantity(): boolean {
    return this.cart !== null;
  }

  private refreshCart(): void {
    this.cartService.getCart().subscribe({
      next: (cart: CartDto) => {
        console.log('✅ Cart refreshed:', cart);
        this.cart = cart;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('❌ Cart refresh error:', err);
        this.error = 'Failed to load cart';
        this.cdr.markForCheck();
      }
    });
  }

  private completeCheckout(): void {
    if (this.checkoutForm.invalid || !this.cart || !this.cart.items.length) {
      this.error = 'Please fill all fields and ensure cart is not empty';
      return;
    }

    this.checkingOut = true;
    this.error = null;
    this.success = null;

    const dto: CheckOutDto = {
      email: this.checkoutForm.get('email')?.value || '',
      fullName: this.checkoutForm.get('fullName')?.value || '',
      phoneNumber: this.checkoutForm.get('phoneNumber')?.value || '',
      city: this.checkoutForm.get('city')?.value || '',
      street: this.checkoutForm.get('street')?.value || '',
      building: this.checkoutForm.get('building')?.value || '',
      apartment: this.checkoutForm.get('apartment')?.value || '',
      neighborhood: this.checkoutForm.get('neighborhood')?.value || ''
    };

    this.cartService.checkout(dto).subscribe({
      next: (response: any) => {
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
      error: (err: any) => {
        console.error('❌ Checkout error:', err);
        this.checkingOut = false;
        this.error = err.error?.message || 'Failed to complete checkout';
      }
    });
  }
}
