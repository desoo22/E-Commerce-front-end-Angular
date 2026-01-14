import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { CartService, CartItem } from '../../core/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  error = '';
  selectedVariant = 0;
  quantity = 1;
  addingToCart = false;
  addedToCart = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: number): void {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (data) => {
        this.product = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load product details';
        this.loading = false;
        console.error('Error loading product:', err);
      }
    });
  }

  incrementQuantity(): void {
    if (this.product?.variants && this.product.variants[this.selectedVariant]) {
      const quantity = this.product.variants[this.selectedVariant].quantity;    
      if (this.quantity < quantity) {
        this.quantity++;
      }
    } else {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  selectVariant(index: number): void {
    this.selectedVariant = index;
    this.quantity = 1;
  }

  addToCart(): void {
    if (!this.product) return;

    this.addingToCart = true;

    const hasVariants = this.product.variants && this.product.variants.length > 0;
    const selectedVariant = hasVariants ? this.product.variants![this.selectedVariant] : null;

    const cartItem: CartItem = {
      productId: this.product.id,
      productName: this.product.name,
      quantity: this.quantity,
      price: selectedVariant ? selectedVariant.price : this.product.price,
      variantId: selectedVariant ? selectedVariant.id : this.product.id  // Use productId as fallback
    };

    console.log('🛒 Adding to cart:', cartItem);

    this.cartService.addItem(cartItem).subscribe({
      next: () => {
        this.addingToCart = false;
        this.addedToCart = true;
        setTimeout(() => {
          this.addedToCart = false;
        }, 2000);
      },
      error: (err) => {
        console.error('Error adding to cart:', err);
        this.addingToCart = false;
      }
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }
}