import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { ProductService } from './core/services/product.service';
import { CategoryService } from './core/services/category.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('ecommerce-frontend');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  readonly isAuthenticated$ = this.auth.isAuthenticated$;
  readonly currentUser$ = this.auth.currentUser$;
  readonly isAdminOrOwner$ = this.currentUser$.pipe(
    map(user => user?.role === 'Admin' || user?.role === 'Owner')
  );
  readonly isOwner$ = this.currentUser$.pipe(
    map(user => user?.role === 'Owner')
  );
  readonly cartCount$ = this.cart.cart$.pipe(
    map(c => c ? (c.totalQuantity ?? (c.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0)) : 0)
  );

  ngOnInit(): void {
    // Preload products and categories in the background for faster page loads
    console.log('🚀 Preloading products and categories...');
    this.productService.getProducts().subscribe({
      next: () => console.log('✅ Products preloaded'),
      error: (err) => console.error('❌ Products preload failed:', err)
    });
    
    this.categoryService.getCategories().subscribe({
      next: () => console.log('✅ Categories preloaded'),
      error: (err) => console.error('❌ Categories preload failed:', err)
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/products']));
  }
}
