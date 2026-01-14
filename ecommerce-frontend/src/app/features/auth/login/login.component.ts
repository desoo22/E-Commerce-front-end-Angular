import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService, CartDto } from '../../../core/services/cart.service';
import { finalize, timeout } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  step: 'email' | 'otp' = 'email';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/products']);
    }
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.step === 'email') {
      this.requestOtp();
    } else if (this.step === 'otp') {
      this.verifyOtp();
    }
  }

  private requestOtp(): void {
    if (this.loginForm.get('email')?.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const email = this.loginForm.get('email')?.value;

    console.log('📧 Requesting OTP for:', email);

    this.authService
      .requestOtp({ email })
      .pipe(timeout(10000), finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe(
        (response) => { 
          console.log('✅ OTP Request Response:', response);
          this.success = 'otp_sent_successfully'; 
          this.step = 'otp';
          console.log('📍 Step changed to:', this.step);
          this.cdr.detectChanges();
        },
        (err: any) => { 
          console.error('❌ OTP Request Error:', err);
          this.error = err.error?.message || 'failed_to_send_otp'; 
        }
      );
  }

  private verifyOtp(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    const dto = {
      email: this.loginForm.get('email')?.value,
      otp: this.loginForm.get('otp')?.value
    };

    // Add timeout handling
    this.authService.verifyOtp(dto).pipe(
      timeout(30000)  // 30 seconds timeout
    ).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.loading = false;
        
        // 🔥 Transfer guest cart to user cart after login, then redirect
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/products';
        this.transferGuestCart().subscribe({
          next: () => {
            console.log('✅ Guest cart transferred (if any)');
            setTimeout(() => this.router.navigate([returnUrl]), 500);
          },
          error: (err: any) => {
            console.error('❌ Guest cart transfer failed', err);
            setTimeout(() => this.router.navigate([returnUrl]), 500);
          }
        });
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.loading = false;
        
        if (error.name === 'TimeoutError') {
          this.error = 'Request timeout. Please try again.';
        } else {
          this.error = error.error?.message || 'Invalid OTP. Please try again.';
        }
      }
    });
  }

  private transferGuestCart(): Observable<CartDto | null> {
    const guestCartRaw = localStorage.getItem('guest_cart');
    if (!guestCartRaw) return of(null);
    
    try {
      const guestCart = JSON.parse(guestCartRaw);
      if (guestCart && guestCart.items && guestCart.items.length > 0) {
        return this.cartService.syncGuestCartToUser();
      }
    } catch (e) {
      console.error('Failed to parse guest cart', e);
    }
    return of(null);
  }

  backToEmail(): void {
    this.step = 'email';
    this.loginForm.get('otp')?.reset();
    this.error = null;
    this.success = null;
  }
}