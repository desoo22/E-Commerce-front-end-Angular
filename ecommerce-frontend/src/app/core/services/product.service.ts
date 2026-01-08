import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProductImage {
  id?: number;
  productId?: number;
  imageUrl: string;
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
  price: number;
  categoryId: number;
  stock: number;
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
  constructor(private apiService: ApiService) {}

  // Get all products
  getProducts(): Observable<Product[]> {
    return this.apiService.get<Product[]>('product');
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

  // Add new product (Admin only)
  addProduct(dto: NewProductDto): Observable<any> {
    return this.apiService.post('product', dto);
  }

  // Update product (Admin only)
  updateProduct(id: number, dto: Partial<Product>): Observable<any> {
    return this.apiService.put(`product/${id}`, dto);
  }

  // Delete product (Admin only)
  deleteProduct(id: number): Observable<any> {
    return this.apiService.delete(`product/${id}`);
  }
}
