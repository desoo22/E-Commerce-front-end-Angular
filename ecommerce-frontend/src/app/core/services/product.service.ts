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

  constructor(private apiService: ApiService) {}

  // Get all products with caching
  getProducts(): Observable<Product[]> {
    // If we have cached data, return it immediately
    if (this.productsCache$.value) {
      console.log('📦 Returning cached products:', this.productsCache$.value.length);
      return of(this.productsCache$.value);
    }

    // If there's an ongoing request, return it
    if (this.productsObservable$) {
      console.log('📦 Returning ongoing products request');
      return this.productsObservable$;
    }

    // Create new request with caching
    console.log('📦 Fetching products from API...');
    this.productsObservable$ = this.apiService.get<Product[]>('product').pipe(
      tap(products => {
        console.log('✅ Products fetched, caching:', products.length, 'items');
        this.productsCache$.next(products);
        this.productsObservable$ = null; // Clear ongoing request
      }),
      shareReplay(1) // Share the result with multiple subscribers
    );

    return this.productsObservable$;
  }

  // Clear cache (call after creating/updating/deleting products)
  clearCache(): void {
    console.log('🗑️ Clearing products cache');
    this.productsCache$.next(null);
    this.productsObservable$ = null;
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
}
