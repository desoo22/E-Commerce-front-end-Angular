import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
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
  private categoriesCache$ = new BehaviorSubject<Category[] | null>(null);
  private categoriesObservable$: Observable<Category[]> | null = null;

  constructor(private apiService: ApiService) {}

  // Get all categories with caching
  getCategories(): Observable<Category[]> {
    // If we have cached data, return it immediately
    if (this.categoriesCache$.value) {
      console.log('📦 Returning cached categories:', this.categoriesCache$.value.length);
      return of(this.categoriesCache$.value);
    }

    // If there's an ongoing request, return it
    if (this.categoriesObservable$) {
      console.log('📦 Returning ongoing categories request');
      return this.categoriesObservable$;
    }

    // Create new request with caching
    console.log('📦 Fetching categories from API...');
    this.categoriesObservable$ = this.apiService.get<Category[]>('category').pipe(
      tap(categories => {
        console.log('✅ Categories fetched, caching:', categories.length, 'items');
        this.categoriesCache$.next(categories);
        this.categoriesObservable$ = null;
      }),
      shareReplay(1)
    );

    return this.categoriesObservable$;
  }

  // Clear cache
  clearCache(): void {
    console.log('🗑️ Clearing categories cache');
    this.categoriesCache$.next(null);
    this.categoriesObservable$ = null;
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
