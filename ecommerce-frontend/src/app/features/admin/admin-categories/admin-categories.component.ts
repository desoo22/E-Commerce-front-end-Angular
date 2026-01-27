import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CategoryService, Category } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface CategoryWithCount extends Category {
  productCount: number;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.css'
})
export class AdminCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  categories: CategoryWithCount[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.error = null;
    
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        console.log('✅ Categories loaded:', categories.length);
        
        // Get product count for each category
        const countRequests = categories.map(category =>
          this.productService.getProductsByCategory(category.name, 1, 1).pipe(
            map(pagedResult => ({
              ...category,
              productCount: pagedResult.totalCount
            })),
            catchError(() => of({
              ...category,
              productCount: 0
            }))
          )
        );

        if (countRequests.length === 0) {
          this.categories = [];
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        forkJoin(countRequests).subscribe({
          next: (categoriesWithCount) => {
            this.categories = categoriesWithCount;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('❌ Error loading product counts:', err);
            this.categories = categories.map(c => ({ ...c, productCount: 0 }));
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('❌ Error loading categories:', err);
        this.error = 'Failed to load categories';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewCategoryProducts(categoryName: string): void {
    this.router.navigate(['/admin/categories', categoryName, 'products']);
  }

  refreshCategories(): void {
    this.categoryService.clearCache();
    this.loadCategories();
  }
}
