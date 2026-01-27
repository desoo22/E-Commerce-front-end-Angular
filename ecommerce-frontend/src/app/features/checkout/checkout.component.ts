import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CartService, CartDto, CheckOutDto } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  cart: CartDto | null = null;
  checkoutForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  shippingCost = 0;
  totalWithShipping = 0;

  ngOnInit(): void {
    // Redirect to login with returnUrl if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    // Get email from token
    let email = '';
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email || '';
      } catch {}
    }

    this.initializeForm(email);
    this.loadCart();
  }

  private initializeForm(email: string = ''): void {
    this.checkoutForm = this.fb.group({
      email: [{ value: email, disabled: true }, [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?\d{10,}$/)]],
      city: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      apartment: ['', Validators.required],
      neighborhood: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
    });
  }

  private loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (data: CartDto) => {
        console.log('✅ Checkout cart loaded:', data);
        this.cart = data;
        this.calculateShippingCost();
        this.loading = false;
        this.cdr.markForCheck();

        if (!data || !data.items || data.items.length === 0) {
          this.error = 'Your cart is empty';
          setTimeout(() => this.router.navigate(['/cart']), 1500);
        }
      },
      error: (err: any) => {
        console.error('❌ Checkout cart error:', err);
        this.error = 'Failed to load cart';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private calculateShippingCost(): void {
    this.shippingCost = 0;
    this.totalWithShipping = (this.cart?.totalPrice || 0) + this.shippingCost;
  }

  submit(): void {
    if (this.checkoutForm.invalid) {
      this.error = 'Please fill all required fields correctly';
      return;
    }

    this.submitting = true;
    this.error = null;

    // Get email from token
    let email = '';
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email || '';
      } catch {}
    }
    
    const checkoutData: CheckOutDto = {
      email: email,
      fullName: this.checkoutForm.get('fullName')?.value,
      phoneNumber: this.checkoutForm.get('phoneNumber')?.value,
      city: this.checkoutForm.get('city')?.value,
      street: this.checkoutForm.get('street')?.value,
      building: this.checkoutForm.get('building')?.value,
      apartment: this.checkoutForm.get('apartment')?.value,
      neighborhood: this.checkoutForm.get('neighborhood')?.value
    };

    this.cartService.checkout(checkoutData).subscribe({
      next: (response) => {
        console.log('✅ Checkout success:', response);
        this.submitting = false;
        this.success = 'Order placed successfully!';
        
        // Clear cart after successful order
        this.cartService.clearCart().subscribe(() => {
          console.log('✅ Cart cleared after checkout');
        });
        
        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 1500);
      },
      error: (err: any) => {
        console.error('❌ Checkout error:', err);
        this.submitting = false;
        this.error = err.error?.message || 'Checkout failed. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  getFieldError(fieldName: string): string {
    const field = this.checkoutForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('email')) {
      return 'Invalid email format';
    }
    if (field?.hasError('minlength')) {
      return `${fieldName} is too short`;
    }
    if (field?.hasError('maxlength')) {
      return `${fieldName} is too long`;
    }
    if (field?.hasError('pattern')) {
      return `Invalid ${fieldName} format`;
    }
    return '';
  }
}
