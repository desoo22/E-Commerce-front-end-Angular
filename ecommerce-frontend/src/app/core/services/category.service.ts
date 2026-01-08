import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface NewCategoryDto {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(private apiService: ApiService) {}

  // Get all categories
  getCategories(): Observable<Category[]> {
    return this.apiService.get<Category[]>('category');
  }

  // Get category by ID
  getCategoryById(id: number): Observable<Category> {
    return this.apiService.get<Category>(`category/id/${id}`);
  }

  // Get category by name
  getCategoryByName(name: string): Observable<Category> {
    return this.apiService.get<Category>(`category/name/${name}`);
  }

  // Get category with products count
  getCategoryWithProductCount(name: string): Observable<any> {
    return this.apiService.get<any>(`category/name/${name}/products/count`);
  }

  // Add category (Admin only)
  addCategory(dto: NewCategoryDto): Observable<any> {
    return this.apiService.post('category', dto);
  }

  // Update category (Admin only)
  updateCategory(id: number, dto: Partial<Category>): Observable<any> {
    return this.apiService.put(`category/id/${id}`, dto);
  }

  // Delete category (Admin only)
  deleteCategory(id: number): Observable<any> {
    return this.apiService.delete(`category/id/${id}`);
  }
}
