import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService, Product } from '../../../core/services/product.service';
import { CategoryService, Category } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  allProducts: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = false;
  error: string | null = null;
  addingToCart: number | null = null;

  get isOwner(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'Owner';
  }

  get isAdminOrOwner(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'Owner' || user?.role === 'Admin';
  }

  ngOnInit(): void {
    this.loadCategoriesAndProducts();
  }

  private loadCategoriesAndProducts(): void {
    this.categoryService.getCategories().subscribe(
      (data) => {
        this.categories = data;
        this.cdr.markForCheck();
        if (this.categories.length > 0) {
          this.loadAllProductsData();
        }
      },
      (err: any) => {
        this.error = 'Failed to load categories';
        this.cdr.markForCheck();
      }
    );
  }

  private loadAllProductsData(): void {
    this.loading = true;
    this.productService.getProducts().subscribe(
      (data) => {
        console.log('✅ All products loaded:', data);
        this.allProducts = data;
        if (this.categories.length > 0) {
          this.selectCategory(this.categories[0]);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      (err: any) => {
        console.error('Error loading products:', err);
        this.loading = false;
        this.error = 'Failed to load products';
        this.cdr.markForCheck();
      }
    );
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.loading = true;
    this.cdr.markForCheck();
    console.log('Selected category:', category);
    this.filterProductsByCategory(category.name);
  }

  private filterProductsByCategory(categoryName: string): void {
    console.log('Filtering products by category:', categoryName);
    this.products = this.allProducts.filter(p => 
      p.categoryName && p.categoryName.toLowerCase() === categoryName.toLowerCase()
    );
    console.log('Filtered products:', this.products);
    this.loading = false;
    this.cdr.markForCheck();
  }

  addToCart(product: Product): void {
    if (this.getProductStock(product) === 0) return;

    const variant = product.variants && product.variants.length ? product.variants[0] : null;
    const variantId = variant ? variant.id : undefined;
    const unitPrice = variant ? variant.price : product.price;

    this.addingToCart = product.id;
    this.cartService.addItem({
      productId: product.id,
      variantId,
      productName: product.description,
      quantity: 1,
      price: unitPrice
    }).subscribe(
      () => {
        this.addingToCart = null;
      },
      (err: any) => {
        this.addingToCart = null;
        console.error('Error:', err);
        this.error = 'Failed to add product to cart';
      }
    );
  }

  getProductImage(product: Product): string {
    if (!product.images || product.images.length === 0) {
      return 'assets/placeholder.png';
    }

    const first = product.images[0];
    return typeof first === 'string' ? first : (first.imageData || first.imageUrl || 'assets/placeholder.png');
  }

  getProductStock(product: Product): number {
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((sum, v) => sum + v.quantity, 0);
  }
}
