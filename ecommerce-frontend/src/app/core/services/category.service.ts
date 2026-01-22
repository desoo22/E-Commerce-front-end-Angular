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
  private fetchingInProgress = false;

  private static readonly CACHE_KEY = 'categoriesCache';
  private static readonly CACHE_TS_KEY = 'categoriesCacheTs';
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private apiService: ApiService) {}

  // Get all categories with caching
  getCategories(): Observable<Category[]> {
    // 1) In-memory cache
    if (this.categoriesCache$.value) {
      console.log('📦 Returning cached categories (memory):', this.categoriesCache$.value.length);
      this.refreshCategoriesSilently();
      return of(this.categoriesCache$.value);
    }

    // 2) localStorage cache
    const ls = localStorage.getItem(CategoryService.CACHE_KEY);
    const tsStr = localStorage.getItem(CategoryService.CACHE_TS_KEY);
    if (ls && tsStr) {
      try {
        const ts = parseInt(tsStr, 10);
        const isFresh = Date.now() - ts < CategoryService.CACHE_TTL_MS;
        const cached: Category[] = JSON.parse(ls);
        if (Array.isArray(cached)) {
          console.log('📦 Returning cached categories (localStorage), fresh:', isFresh);
          this.categoriesCache$.next(cached);
          this.refreshCategoriesSilently();
          return of(cached);
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse categories cache from localStorage', e);
      }
    }

    // 3) Ongoing request
    if (this.categoriesObservable$) {
      console.log('📦 Returning ongoing categories request');
      return this.categoriesObservable$;
    }

    // 4) Fetch from API
    console.log('📦 Fetching categories from API...');
    this.fetchingInProgress = true;
    this.categoriesObservable$ = this.apiService.get<Category[]>('category').pipe(
      tap(categories => {
        console.log('✅ Categories fetched, caching:', categories.length, 'items');
        this.categoriesCache$.next(categories);
        try {
          localStorage.setItem(CategoryService.CACHE_KEY, JSON.stringify(categories));
          localStorage.setItem(CategoryService.CACHE_TS_KEY, Date.now().toString());
        } catch {}
        this.categoriesObservable$ = null;
        this.fetchingInProgress = false;
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
    try {
      localStorage.removeItem(CategoryService.CACHE_KEY);
      localStorage.removeItem(CategoryService.CACHE_TS_KEY);
    } catch {}
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

  private refreshCategoriesSilently(): void {
    if (this.fetchingInProgress) return;
    this.fetchingInProgress = true;
    this.apiService.get<Category[]>('category').subscribe({
      next: (categories) => {
        console.log('🔄 Silent refresh: categories updated:', categories.length);
        this.categoriesCache$.next(categories);
        try {
          localStorage.setItem(CategoryService.CACHE_KEY, JSON.stringify(categories));
          localStorage.setItem(CategoryService.CACHE_TS_KEY, Date.now().toString());
        } catch {}
        this.fetchingInProgress = false;
      },
      error: () => {
        console.warn('⚠️ Silent refresh categories failed');
        this.fetchingInProgress = false;
      }
    });
  }
}
