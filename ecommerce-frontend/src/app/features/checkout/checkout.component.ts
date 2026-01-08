import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CartService, CartDto, CheckOutDto } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  cart: CartDto | null = null;
  checkoutForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.loadCart();
  }

  private initializeForm(): void {
    this.checkoutForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]{10,}$/)]],
      city: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      apartment: ['', Validators.required]
    });
  }

  private loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (data) => {
        this.cart = data;
        this.loading = false;
        if (!data.items || data.items.length === 0) {
          this.error = 'Your cart is empty. Please add items before checkout.';
          setTimeout(() => this.router.navigate(['/products']), 2000);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load cart. Please try again.';
        console.error('Cart load error:', err);
      }
    });
  }

  submit(): void {
    if (this.checkoutForm.invalid || !this.cart) {
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    this.submitting = true;
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
        this.submitting = false;
        this.success = '✅ Order placed successfully!';
        if (response.paymentUrl) {
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
        this.submitting = false;
        this.error = err.error?.message || 'Failed to process checkout. Please try again.';
        console.error('Checkout error:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  getFieldError(fieldName: string): string {
    const field = this.checkoutForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.formatFieldName(fieldName)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Invalid email address';
    }
    if (field?.hasError('pattern')) {
      return `Invalid ${this.formatFieldName(fieldName)}`;
    }
    if (field?.hasError('minlength')) {
      return `${this.formatFieldName(fieldName)} must be at least 3 characters`;
    }
    return '';
  }

  private formatFieldName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}