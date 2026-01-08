import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../../core/services/product.service';
import { CategoryService, Category } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = false;
  error: string | null = null;
  addingToCart: number | null = null;
  

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    // Don't call loadProducts() directly - it needs a categoryName
    // The loadCategories() will call selectCategory() which loads products
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe(
      (data) => {
        this.categories = data;
        if (this.categories.length > 0) {
          this.selectCategory(this.categories[0]);
        }
      },
      (err) => {
        this.error = 'Failed to load categories';
      }
    );
  }

  private loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe(
      (data) => {
        console.log('✅ Products loaded:', data);
        this.products = data;
        this.loading = false;
      },
      (err) => {
        console.error(' Error loading products:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error response body:', err.error);
        this.loading = false;
        this.error = 'Failed to load products';
      }
    );
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.loadProductsByCategory(category.name);
  }

  private loadProductsByCategory(categoryName: string): void {
    this.loading = true;
    this.productService.getProductsByCategory(categoryName).subscribe(
      (data) => {
        this.products = data;
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = 'Failed to load products';
      }
    );
  }

  addToCart(product: Product): void {
    if (product.stock === 0) return;

    const variant = product.variants && product.variants.length ? product.variants[0] : null;
    const variantId = variant ? variant.id : undefined;
    const unitPrice = variant ? variant.price : product.price;

    this.addingToCart = product.id;
    this.cartService.addItem({
      productId: product.id,
      variantId,
      productName: product.name,
      quantity: 1,
      price: unitPrice
    }).subscribe(
      () => {
        this.addingToCart = null;
        
      },
      (err) => {
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
  return typeof first === 'string' ? first : first.imageUrl || 'assets/placeholder.png';
}
}