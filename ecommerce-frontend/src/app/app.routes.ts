import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ProductsComponent } from './features/products/products-list/products.component';
import { ProductDetailComponent } from './features/Product-Details/product-detail.component';
import { CartComponent } from './features/cart/cart.component';
import { OrdersComponent } from './features/orders/orders.component';
import { ProfileComponent } from './features/profile/profile.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { AdminProductsComponent } from './features/admin/admin-products/admin-products.component';
import { AdminCategoriesComponent } from './features/admin/admin-categories/admin-categories.component';
import { AdminOrdersComponent } from './features/admin/admin-orders/admin-orders.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users.component';
import { adminGuard } from './core/guards/admin.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'cart', component: CartComponent },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      { path: 'products', component: AdminProductsComponent },
      { path: 'categories', component: AdminCategoriesComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'users', component: AdminUsersComponent, canActivate: [ownerGuard] }
    ]
  },
  { path: '', redirectTo: '/products', pathMatch: 'full' }
];
