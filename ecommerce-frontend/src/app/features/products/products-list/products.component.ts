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

    buyNow(product: Product): void {
      if (this.getProductStock(product) === 0) return;

      // يمكنك هنا تمرير بيانات المنتج عبر state أو query params
      // سنستخدم state (أكثر أمانًا)
      const variant = product.variants && product.variants.length ? product.variants[0] : null;
      const variantId = variant ? variant.id : undefined;
      const unitPrice = variant ? variant.price : product.price;

      // إذا لم يكن المستخدم مسجل دخول، وجهه للـ login أولاً
      if (!this.authService.isAuthenticated()) { // <-- FIXED LINE
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
        return;
      }

      // انتقل إلى صفحة checkout مع بيانات المنتج فقط
      this.router.navigate(['/checkout'], {
        state: {
          directBuy: true,
          item: {
            productId: product.id,
            variantId,
            productName: product.name,
            quantity: 1,
            price: unitPrice
          }
        }
      });
    }
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
    // Ensure we fetch fresh products (clear any stale in-memory/local caches)
    this.productService.clearCache();

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
    const variantId = variant ? variant.id : undefined; // اتركها undefined إذا المنتج ليس له variants
    const unitPrice = variant ? variant.price : product.price;

    this.addingToCart = product.id;
    this.cartService.addItem({
      productId: product.id, // أرسل دائماً productId
      variantId, // أرسل variantId فقط إذا موجود
      productName: product.description,
      quantity: 1,
      price: unitPrice
    }).subscribe(
      () => {
        this.addingToCart = null;
        this.error = null;
      },
      (err: any) => {
        this.addingToCart = null;
        console.error('Error:', err);
        this.error = err?.message || 'Failed to add product to cart';
        this.cdr.markForCheck();
      }
    );
  }

  getProductImage(product: Product): string {
    console.log(`🖼️ Product ${product.id} - ${product.name} images:`, product.images);
    
    if (!product.images || product.images.length === 0) {
      console.log(`❌ No images for product ${product.id}`);
      return 'https://via.placeholder.com/400x300/e0e0e0/757575?text=No+Image';
    }

    const first = product.images[0];
    console.log(`📸 First image object for ${product.id}:`, first);
    
    if (typeof first === 'string') {
      console.log(`✅ Image is a string for ${product.id}`);
      return first;
    }
    
    // Support both imageData (lowercase) and ImageData (capital) from API
    const imageUrl = (first as any).ImageData || (first as any).imageData || (first as any).imageUrl;
    console.log(`🔗 Extracted imageUrl for ${product.id}:`, imageUrl ? imageUrl.substring(0, 50) + '...' : 'NULL');
    return imageUrl || 'https://via.placeholder.com/400x300/e0e0e0/757575?text=No+Image';
  }

  getProductStock(product: Product): number {
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((sum, v) => sum + v.quantity, 0);
  }
}
