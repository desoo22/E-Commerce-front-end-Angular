import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay, map } from 'rxjs/operators';
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

export interface PagedResult<T> {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  data: T[];
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

  // Get all products with caching (now with pagination support)
  getProducts(pageNumber: number = 1, pageSize: number = 12): Observable<Product[]> {
    // For backward compatibility, if requesting page 1, try cache first
    if (pageNumber === 1) {
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
    }

    // 3) Fetch from API with pagination
    console.log(`📦 Fetching products from API (page ${pageNumber}, size ${pageSize})...`);
    return this.apiService.get<PagedResult<Product>>(`product?pageNumber=${pageNumber}&pageSize=${pageSize}`).pipe(
      map(pagedResult => {
        console.log('✅ Products fetched:', pagedResult.data.length, 'items (page', pagedResult.pageNumber, 'of', pagedResult.totalPages + ')');
        
        // Cache only first page
        if (pageNumber === 1) {
          this.productsCache$.next(pagedResult.data);
          try {
            localStorage.setItem(ProductService.CACHE_KEY, JSON.stringify(pagedResult.data));
            localStorage.setItem(ProductService.CACHE_TS_KEY, Date.now().toString());
          } catch {}
        }
        
        return pagedResult.data;
      })
    );
  }

  // Get paginated products with full metadata
  getProductsPaged(pageNumber: number = 1, pageSize: number = 12, categoryName?: string, search?: string): Observable<PagedResult<Product>> {
    let url = `product?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (categoryName) {
      url += `&categoryName=${encodeURIComponent(categoryName)}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    console.log(`📦 Fetching paginated products: ${url}`);
    return this.apiService.get<PagedResult<Product>>(url).pipe(
      tap(pagedResult => {
        console.log('✅ Paginated products fetched:', {
          page: pagedResult.pageNumber,
          totalPages: pagedResult.totalPages,
          totalCount: pagedResult.totalCount,
          itemsInPage: pagedResult.data.length
        });
      })
    );
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

  // Get products by category (with pagination)
  getProductsByCategory(categoryName: string, pageNumber: number = 1, pageSize: number = 12): Observable<PagedResult<Product>> {
    return this.getProductsPaged(pageNumber, pageSize, categoryName);
  }

  // Search products (with pagination)
  searchProducts(query: string, pageNumber: number = 1, pageSize: number = 12): Observable<PagedResult<Product>> {
    return this.getProductsPaged(pageNumber, pageSize, undefined, query);
  }

  // Get single product by ID
  getProductById(id: number): Observable<Product> {
    return this.apiService.get<Product>(`product/${id}`);
  }

  // Add new product with file upload (Admin/Owner only)
  createProduct(formData: FormData): Observable<any> {
    return this.apiService.post('product', formData).pipe(
      tap(() => this.clearCache())
    );
  }

  // Update product with file upload (Admin/Owner only)
  updateProduct(id: number, formData: FormData | Partial<Product>): Observable<any> {
    return this.apiService.put(`product/${id}`, formData).pipe(
      tap(() => this.clearCache())
    );
  }

  // Delete product (Admin/Owner only)
  deleteProduct(id: number): Observable<any> {
    return this.apiService.delete(`product/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  // Trigger a silent refresh if not already fetching
  private refreshProductsSilently(): void {
    if (this.fetchingInProgress) return;
    this.fetchingInProgress = true;
    this.apiService.get<PagedResult<Product>>('product?pageNumber=1&pageSize=12').subscribe({
      next: (pagedResult) => {
        console.log('🔄 Silent refresh: products updated:', pagedResult.data.length);
        this.productsCache$.next(pagedResult.data);
        try {
          localStorage.setItem(ProductService.CACHE_KEY, JSON.stringify(pagedResult.data));
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
