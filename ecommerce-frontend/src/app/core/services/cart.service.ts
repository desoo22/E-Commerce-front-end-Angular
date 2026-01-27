import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
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
  governorateId?: number;
  city: string;
  street: string;
  building: string;
  apartment: string;
  neighborhood: string;
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
    try {
      const raw = localStorage.getItem(this.GUEST_KEY);
      const parsed = raw ? JSON.parse(raw) as CartDto : { items: [], totalPrice: 0, totalQuantity: 0 };
      parsed.totalQuantity = parsed.items.reduce((a, i) => a + i.quantity, 0);
      parsed.totalPrice = parsed.items.reduce((a, i) => a + i.price * i.quantity, 0);
      return parsed;
    } catch (e) {
      console.warn('Failed to read guest cart from localStorage:', e);
      return { items: [], totalPrice: 0, totalQuantity: 0 };
    }
  }

  private writeGuest(cart: CartDto) {
    try {
      cart.totalQuantity = cart.items.reduce((a, i) => a + i.quantity, 0);
      cart.totalPrice = cart.items.reduce((a, i) => a + i.price * i.quantity, 0);
      localStorage.setItem(this.GUEST_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to write guest cart to localStorage:', e);
    }
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
      const guest = this.readGuest();
      this.cartSubject.next(guest);
      return;
    }
    this.apiService.get<any>('cart').subscribe({
      next: (data) => {
        const mapped = this.mapServerCart(data);
        this.cartSubject.next(mapped);
      },
      error: () => {
        this.cartSubject.next({ items: [], totalPrice: 0, totalQuantity: 0 });
      }
    });
  }

  getCart(): Observable<CartDto> {
    if (!this.isAuthed()) {
      return of(this.readGuest());
    }
    return this.apiService.get<any>('cart').pipe(
      map(data => this.mapServerCart(data)),
      catchError(() => of({ items: [], totalPrice: 0, totalQuantity: 0 }))
    );
  }

  /**
   * Move guest cart items to the authenticated user's cart on the server
   */
  syncGuestCartToUser(): Observable<CartDto> {
    const guest = this.readGuest();
    if (!guest.items.length) {
      return this.getCart();
    }

    return this.apiService.post<any>('cart/guest-to-user', guest).pipe(
      map(data => this.mapServerCart(data)),
      tap(cart => {
        this.cartSubject.next(cart);
        localStorage.removeItem(this.GUEST_KEY);
      }),
      catchError(() => {
        // If sync fails, keep guest cart but don't break login flow
        return of(this.readGuest());
      })
    );
  }

  addItem(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const guest = this.readGuest();
      // Create unique key: use variantId if exists, otherwise productId
      const itemKey = item.variantId ?? item.productId;
      const existing = guest.items.find(i => {
        const existingKey = i.variantId ?? i.productId;
        return existingKey === itemKey;
      });
      
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        guest.items.push(item);
      }
      this.writeGuest(guest);
      return of(guest);
    }

    // أرسل productId دائماً وvariantId فقط إذا كان موجوداً
    const payload: any = {
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
      unitPrice: item.price
    };
    if (item.variantId) {
      payload.productVariantId = item.variantId;
    }

    return this.apiService.post<any>('cart/items', payload).pipe(
      map(data => this.mapServerCart(data)),
      tap(cart => this.cartSubject.next(cart))
    );
  }

  removeItem(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const guest = this.readGuest();
      const itemKey = item.variantId ?? item.productId;
      guest.items = guest.items.filter(i => {
        const existingKey = i.variantId ?? i.productId;
        return existingKey !== itemKey;
      });
      this.writeGuest(guest);
      return of(guest);
    }
    const variantId = item.variantId ?? null;
    if (this.isAuthed() && !variantId) {
      return throwError(() => new Error('Missing product variant id for authenticated request'));
    }

    return this.apiService.delete<any>('cart/items', {
      productVariantId: variantId,
      quantity: item.quantity || 1,
      productName: item.productName,
      unitPrice: item.price
    }).pipe(
      map(data => this.mapServerCart(data)),
      tap(cart => this.cartSubject.next(cart))
    );
  }

  updateQuantity(item: CartItem, newQuantity: number): Observable<CartDto> {
    if (!this.isAuthed()) {
      const guest = this.readGuest();
      const itemKey = item.variantId ?? item.productId;
      const existingItem = guest.items.find(i => {
        const existingKey = i.variantId ?? i.productId;
        return existingKey === itemKey;
      });
      
      if (existingItem) {
        if (newQuantity <= 0) {
          guest.items = guest.items.filter(i => {
            const existingKey = i.variantId ?? i.productId;
            return existingKey !== itemKey;
          });
        } else {
          existingItem.quantity = newQuantity;
        }
      }
      this.writeGuest(guest);
      return of(guest);
    }
    // Authenticated: backend supports add/remove with quantities, but not direct update.
    // Compute delta and call appropriate endpoint.
    const currentCart = this.getCartValue();
    const currentItem = currentCart?.items.find(i => (i.variantId ?? i.productId) === (item.variantId ?? item.productId));
    const currentQty = currentItem?.quantity ?? 0;
    const delta = newQuantity - currentQty;

    if (delta > 0) {
      // Increase quantity
      const variantId = item.variantId ?? null;
      if (this.isAuthed() && !variantId) {
        return throwError(() => new Error('Missing product variant id for authenticated request'));
      }

      return this.apiService.post<any>('cart/items', {
        productVariantId: variantId,
        quantity: delta,
        productName: item.productName,
        unitPrice: item.price
      }).pipe(
        map(data => this.mapServerCart(data)),
        tap(cart => this.cartSubject.next(cart))
      );
    } else if (delta < 0) {
      // Decrease quantity
      const variantId = item.variantId ?? null;
      if (this.isAuthed() && !variantId) {
        return throwError(() => new Error('Missing product variant id for authenticated request'));
      }

      return this.apiService.delete<any>('cart/items', {
        productVariantId: variantId,
        quantity: Math.abs(delta),
        productName: item.productName,
        unitPrice: item.price
      }).pipe(
        map(data => this.mapServerCart(data)),
        tap(cart => this.cartSubject.next(cart))
      );
    } else {
      // No change
      return of(currentCart ?? { items: [], totalPrice: 0, totalQuantity: 0 });
    }
  }

  clearCart(): Observable<any> {
    if (!this.isAuthed()) {
      this.writeGuest({ items: [], totalPrice: 0, totalQuantity: 0 });
      return of({});
    }
    return this.apiService.delete('cart/clear').pipe(
      tap(() => this.cartSubject.next({ items: [], totalPrice: 0, totalQuantity: 0 }))
    );
  }

  checkout(dto: CheckOutDto): Observable<any> {
    return this.apiService.post('cart/checkout', dto).pipe(
      tap(() => {
        this.cartSubject.next({ items: [], totalPrice: 0, totalQuantity: 0 });
        if (!this.isAuthed()) {
          localStorage.removeItem(this.GUEST_KEY);
        }
      })
    );
  }

  increaseQuantity(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const guest = this.readGuest();
      const itemKey = item.variantId ?? item.productId;
      const existing = guest.items.find(i => {
        const existingKey = i.variantId ?? i.productId;
        return existingKey === itemKey;
      });
      if (existing) {
        existing.quantity++;
      }
      this.writeGuest(guest);
      return of(guest);
    }
    const variantId = item.variantId ?? null;
    if (this.isAuthed() && !variantId) {
      return throwError(() => new Error('Missing product variant id for authenticated request'));
    }

    return this.apiService.post<any>('cart/items/increase', {
      productVariantId: variantId,
      quantity: 1,
      productName: item.productName,
      unitPrice: item.price
    }).pipe(
      map(data => this.mapServerCart(data)),
      tap(cart => this.cartSubject.next(cart))
    );
  }

  decreaseQuantity(item: CartItem): Observable<CartDto> {
    if (!this.isAuthed()) {
      const guest = this.readGuest();
      const itemKey = item.variantId ?? item.productId;
      const existing = guest.items.find(i => {
        const existingKey = i.variantId ?? i.productId;
        return existingKey === itemKey;
      });
      if (existing) {
        if (existing.quantity > 1) {
          existing.quantity--;
        } else {
          guest.items = guest.items.filter(i => {
            const k = i.variantId ?? i.productId;
            return k !== itemKey;
          });
        }
      }
      this.writeGuest(guest);
      return of(guest);
    }
    const variantId = item.variantId ?? null;
    if (this.isAuthed() && !variantId) {
      return throwError(() => new Error('Missing product variant id for authenticated request'));
    }

    return this.apiService.post<any>('cart/items/decrease', {
      productVariantId: variantId,
      quantity: 1,
      productName: item.productName,
      unitPrice: item.price
    }).pipe(
      map(data => this.mapServerCart(data)),
      tap(cart => this.cartSubject.next(cart))
    );
  }

  getCartValue(): CartDto | null {
    return this.cartSubject.value;
  }
}
