import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface CartItem {
  productId: number;
  variantId?: number;
  productName?: string;
  quantity: number;
  price: number;
}

export interface CartDto {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
}

export interface CheckOutDto {
  email: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  street: string;
  building: string;
  apartment: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<CartDto | null>(null);
  public cart$ = this.cartSubject.asObservable();

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private GUEST_KEY = 'guest_cart';

  constructor() {
    this.loadCart();
    this.authService.isAuthenticated$.subscribe(() => this.loadCart());
  }

  // ==================== HELPERS ====================

  private isAuthed(): boolean {
    return this.authService.isAuthenticated();
  }

  private readGuest(): CartDto {
    const raw = localStorage.getItem(this.GUEST_KEY);
    const parsed = raw ? JSON.parse(raw) as CartDto : { items: [], totalPrice: 0, totalQuantity: 0 };
    parsed.totalQuantity = parsed.items.reduce((a, i) => a + i.quantity, 0);
    parsed.totalPrice = parsed.items.reduce((a, i) => a + i.price * i.quantity, 0);
    return parsed;
  }

  private writeGuest(cart: CartDto) {
    cart.totalQuantity = cart.items.reduce((a, i) => a + i.quantity, 0);
    cart.totalPrice = cart.items.reduce((a, i) => a + i.price * i.quantity, 0);
    localStorage.setItem(this.GUEST_KEY, JSON.stringify(cart));
    this.cartSubject.next(cart);
  }

  private mapServerCart(server: any): CartDto {
    // Backend returns { items: [...], totalPrice, totalQuantity }
    // Each item has: ProductVariantId, ProductName, Quantity, UnitPrice
    const items: CartItem[] = (server?.items || server?.Items || []).map((it: any) => ({
      productId: it.productVariantId ?? it.ProductVariantId,
      variantId: it.productVariantId ?? it.ProductVariantId,
      productName: it.productName ?? it.ProductName,
      quantity: it.quantity ?? it.Quantity,
      price: it.unitPrice ?? it.UnitPrice
    }));
    const totalPrice = server?.totalPrice ?? server?.TotalPrice ?? items.reduce((a, i) => a + i.price * i.quantity, 0);
    const totalQuantity = items.reduce((a, i) => a + i.quantity, 0);
    return { items, totalPrice, totalQuantity };
  }

  // ==================== MAIN METHODS ====================

  loadCart(): void {
    if (!this.isAuthed()) {
      this.cartSubject.next(this.readGuest());
      return;
    }
    this.getCart().subscribe({
      next: cart => this.cartSubject.next(cart),
      error: err => {
        console.error('❌ Error loading cart:', err);
        // Fallback to guest cart on auth error
        this.cartSubject.next(this.readGuest());
      }
    });
  }

  getCart(): Observable<CartDto> {
    if (!this.isAuthed()) {
      return of(this.readGuest());
    }
    
    return this.apiService.get<any>('cart').pipe(
      map(s => this.mapServerCart(s)),
      catchError(err => {
        console.error('❌ Cart API error:', err);
        // Fallback to guest cart on error
        return of(this.readGuest());
      })
    );
  }

  addItem(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const cart = this.readGuest();
      const key = item.variantId ?? item.productId;
      const existing = cart.items.find(i => (i.variantId ?? i.productId) === key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        cart.items.push({ ...item });
      }
      this.writeGuest(cart);
      return of(cart);
    }

    const dto = {
      productVariantId: item.variantId ?? item.productId,
      productName: item.productName ?? '',
      quantity: item.quantity,
      unitPrice: item.price
    };
    return this.apiService.post<any>('cart/items', dto).pipe(
      map(s => this.mapServerCart(s)),
      tap(c => this.cartSubject.next(c))
    );
  }

  removeItem(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const cart = this.readGuest();
      const key = item.variantId ?? item.productId;
      const existing = cart.items.find(i => (i.variantId ?? i.productId) === key);
      if (existing) {
        if (existing.quantity > item.quantity) {
          existing.quantity -= item.quantity;
        } else {
          cart.items = cart.items.filter(i => (i.variantId ?? i.productId) !== key);
        }
      }
      this.writeGuest(cart);
      return of(cart);
    }

    const dto = {
      productVariantId: item.variantId ?? item.productId,
      productName: item.productName ?? '',
      quantity: item.quantity,
      unitPrice: item.price
    };
    return this.apiService.delete<any>('cart/items', dto).pipe(
      map(s => this.mapServerCart(s)),
      tap(c => this.cartSubject.next(c))
    );
  }

  clearCart(): Observable<any> {
    if (!this.isAuthed()) {
      this.writeGuest({ items: [], totalPrice: 0, totalQuantity: 0 });
      return of(null);
    }
    return this.apiService.delete('cart/clear').pipe(
      tap(() => this.cartSubject.next({ items: [], totalPrice: 0, totalQuantity: 0 }))
    );
  }

  checkout(dto: CheckOutDto): Observable<any> {
    if (!this.isAuthed()) {
      return of({ error: 'login_required' });
    }
    return this.apiService.post('checkout', dto).pipe(
      tap(() => this.cartSubject.next({ items: [], totalPrice: 0, totalQuantity: 0 }))
    );
  }

  getCartValue(): CartDto | null {
    return this.cartSubject.value;
  }
}
