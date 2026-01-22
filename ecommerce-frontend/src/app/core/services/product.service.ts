import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface ProductImage {
  id?: number;
  productId?: number;
  imageUrl?: string;
  imageData?: string;
}

export interface ProductVariant {
  id: number;
  productId?: number;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  categoryName: string;
  price: number;
  shippingCost?: number; // Shipping cost set by Owner/Admin
  images: Array<string | ProductImage>;
  variants?: ProductVariant[];
}

export interface NewProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  stock: number;
  images: Array<string | ProductImage>;
  variants?: ProductVariant[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsCache$ = new BehaviorSubject<Product[] | null>(null);
  private productsObservable$: Observable<Product[]> | null = null;
  private fetchingInProgress = false;

  private static readonly CACHE_KEY = 'productsCache';
  private static readonly CACHE_TS_KEY = 'productsCacheTs';
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private apiService: ApiService) {}

  // Get all products with caching
  getProducts(): Observable<Product[]> {
    // 1) Try in-memory cache first
    if (this.productsCache$.value) {
      console.log('📦 Returning cached products (memory):', this.productsCache$.value.length);
      // Kick off a silent refresh if not already fetching
      this.refreshProductsSilently();
      return of(this.productsCache$.value);
    }

    // 2) Try localStorage cache with TTL for instant UI
    const ls = localStorage.getItem(ProductService.CACHE_KEY);
    const tsStr = localStorage.getItem(ProductService.CACHE_TS_KEY);
    if (ls && tsStr) {
      try {
        const ts = parseInt(tsStr, 10);
        const isFresh = Date.now() - ts < ProductService.CACHE_TTL_MS;
        const cached: Product[] = JSON.parse(ls);
        if (Array.isArray(cached) && cached.length >= 0) {
          console.log('📦 Returning cached products (localStorage), fresh:', isFresh);
          this.productsCache$.next(cached);
          // Always refresh in background to keep data updated
          this.refreshProductsSilently();
          return of(cached);
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse products cache from localStorage', e);
      }
    }

    // 3) If there's an ongoing request, return it
    if (this.productsObservable$) {
      console.log('📦 Returning ongoing products request');
      return this.productsObservable$;
    }

    // 4) No cache → fetch from API
    console.log('📦 Fetching products from API...');
    this.fetchingInProgress = true;
    this.productsObservable$ = this.apiService.get<Product[]>('product').pipe(
      tap(products => {
        console.log('✅ Products fetched, caching:', products.length, 'items');
        this.productsCache$.next(products);
        try {
          localStorage.setItem(ProductService.CACHE_KEY, JSON.stringify(products));
          localStorage.setItem(ProductService.CACHE_TS_KEY, Date.now().toString());
        } catch {}
        this.productsObservable$ = null; // Clear ongoing request
        this.fetchingInProgress = false;
      }),
      shareReplay(1)
    );

    return this.productsObservable$;
  }

  // Clear cache (call after creating/updating/deleting products)
  clearCache(): void {
    console.log('🗑️ Clearing products cache');
    this.productsCache$.next(null);
    this.productsObservable$ = null;
    try {
      localStorage.removeItem(ProductService.CACHE_KEY);
      localStorage.removeItem(ProductService.CACHE_TS_KEY);
    } catch {}
  }

  // Get all products for admin/owner dashboard
  getAllForAdmin(): Observable<Product[]> {
    return this.apiService.get<Product[]>('product/all');
  }

  // Get products by category
  getProductsByCategory(categoryName: string): Observable<Product[]> {
    return this.apiService.get<Product[]>(`product?categoryName=${categoryName}`);
  }

  // Search products
  searchProducts(query: string): Observable<Product[]> {
    return this.apiService.get<Product[]>(`product?search=${query}`);
  }

  // Get single product by ID
  getProductById(id: number): Observable<Product> {
    return this.apiService.get<Product>(`product/${id}`);
  }

  // Add new product with file upload (Admin/Owner only)
  createProduct(formData: FormData): Observable<any> {
    return this.apiService.post('product', formData);
  }

  // Update product with file upload (Admin/Owner only)
  updateProduct(id: number, formData: FormData | Partial<Product>): Observable<any> {
    return this.apiService.put(`product/${id}`, formData);
  }

  // Delete product (Admin/Owner only)
  deleteProduct(id: number): Observable<any> {
    return this.apiService.delete(`product/${id}`);
  }

  // Trigger a silent refresh if not already fetching
  private refreshProductsSilently(): void {
    if (this.fetchingInProgress) return;
    this.fetchingInProgress = true;
    this.apiService.get<Product[]>('product').subscribe({
      next: (products) => {
        console.log('🔄 Silent refresh: products updated:', products.length);
        this.productsCache$.next(products);
        try {
          localStorage.setItem(ProductService.CACHE_KEY, JSON.stringify(products));
          localStorage.setItem(ProductService.CACHE_TS_KEY, Date.now().toString());
        } catch {}
        this.fetchingInProgress = false;
      },
      error: () => {
        console.warn('⚠️ Silent refresh failed');
        this.fetchingInProgress = false;
      }
    });
  }
}
