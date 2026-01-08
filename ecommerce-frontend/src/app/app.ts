import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ecommerce-frontend');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);

  readonly isAuthenticated$ = this.auth.isAuthenticated$;
  readonly cartCount$ = this.cart.cart$.pipe(
    map(c => c ? (c.totalQuantity ?? (c.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0)) : 0)
  );

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/products']));
  }
}
