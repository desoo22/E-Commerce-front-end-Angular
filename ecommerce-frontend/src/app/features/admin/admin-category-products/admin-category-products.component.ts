import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, Product } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-admin-category-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-category-products.component.html',
  styleUrl: './admin-category-products.component.css'
})
export class AdminCategoryProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  categoryName: string = '';
  products: Product[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;
  showAddForm = false;
  editingProduct: any = null;
  selectedImages: File[] = [];
  previewImages: string[] = [];
  imagePreviews: string[] = [];

  newProduct = {
    name: '',
    description: '',
    categoryName: '',
    price: 0,
    variantPrice: 0,
    variantQuantity: 10,
    variantColor: '',
    variantSize: ''
  };

  ngOnInit(): void {
    this.categoryName = this.route.snapshot.paramMap.get('name') || '';
    if (!this.categoryName) {
      this.router.navigate(['/admin/categories']);
      return;
    }
    this.newProduct.categoryName = this.categoryName;
    this.loadProducts();
  }

  loadProducts(): void {
    console.log(`📦 Loading products for category: ${this.categoryName}`);
    this.loading = true;
    this.error = null;
    
    this.productService.getProductsByCategory(this.categoryName, 1, 100).subscribe({
      next: (pagedResult) => {
        console.log('✅ Category products loaded:', pagedResult.data.length);
        this.products = pagedResult.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load category products', err);
        this.loading = false;
        this.error = 'Failed to load products: ' + (err.error?.message || err.message);
        this.cdr.detectChanges();
      }
    });
  }

  addProduct(): void {
    this.showAddForm = true;
    this.editingProduct = null;
    this.resetForm();
  }

  editProduct(product: Product): void {
    this.showAddForm = true;
    this.editingProduct = { ...product };
    this.newProduct = {
      name: product.name || '',
      description: product.description,
      categoryName: product.categoryName,
      price: product.price,
      variantPrice: product.variants?.[0]?.price || 0,
      variantQuantity: product.variants?.[0]?.quantity || 10,
      variantColor: product.variants?.[0]?.color || '',
      variantSize: product.variants?.[0]?.size || ''
    };
    // Clear images - don't load old images to prevent duplication
    this.selectedImages = [];
    this.previewImages = [];
    this.imagePreviews = [];
  }

  saveProduct(): void {
    if (!this.newProduct.name || !this.newProduct.description || !this.newProduct.price) {
      alert('Please fill all required fields: Name, Description, and Price');
      return;
    }

    if (this.editingProduct) {
      const productData: any = {
        id: this.editingProduct.id,
        name: this.newProduct.name,
        description: this.newProduct.description,
        categoryName: this.newProduct.categoryName,
        price: this.newProduct.price,
        variants: [{
          id: this.editingProduct.variants?.[0]?.id || 0,
          price: this.newProduct.variantPrice || this.newProduct.price,
          quantity: this.newProduct.variantQuantity || 10,
          color: this.newProduct.variantColor || 'Default',
          size: this.newProduct.variantSize || 'One Size'
        }]
      };
      
      // Only send new images if user selected new ones
      if (this.selectedImages.length > 0 && this.imagePreviews.length > 0) {
        productData.images = this.imagePreviews.map(preview => ({
          imageData: preview
        }));
      }

      console.log('Updating product:', productData);

      this.productService.updateProduct(this.editingProduct.id, productData).subscribe({
        next: () => {
          this.success = 'Product updated successfully!';
          setTimeout(() => this.success = null, 3000);
          this.cancelEdit();
          this.loadProducts();
        },
        error: (err) => {
          console.error('Update error:', err);
          this.error = 'Error updating product: ' + (err.error?.message || err.message);
          setTimeout(() => this.error = null, 5000);
        }
      });
    } else {
      const formData = new FormData();
      formData.append('name', this.newProduct.name);
      formData.append('description', this.newProduct.description);
      formData.append('categoryName', this.newProduct.categoryName);
      formData.append('price', this.newProduct.price.toString());
      formData.append('variantPrice', (this.newProduct.variantPrice || this.newProduct.price).toString());
      formData.append('variantQuantity', (this.newProduct.variantQuantity || 10).toString());
      formData.append('variantColor', this.newProduct.variantColor || 'Default');
      formData.append('variantSize', this.newProduct.variantSize || 'One Size');

      for (let file of this.selectedImages) {
        formData.append('Images', file);
      }

      console.log('Creating product with FormData');
      
      this.productService.createProduct(formData).subscribe({
        next: (response) => {
          console.log('✅ Product created:', response);
          this.success = 'Product created successfully!';
          setTimeout(() => this.success = null, 3000);
          this.cancelEdit();
          this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Create error:', err);
          this.error = 'Error creating product: ' + (err.error?.message || err.message);
          setTimeout(() => this.error = null, 5000);
        }
      });
    }
  }

  onImageSelected(event: any): void {
    const files = event.target.files;
    if (!files) return;

    this.selectedImages = Array.from(files);
    this.previewImages = [];
    this.imagePreviews = [];

    for (let file of this.selectedImages) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result;
        this.previewImages.push(base64);
        this.imagePreviews.push(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  deleteProduct(id: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.loading = true;
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          console.log('✅ Product deleted successfully');
          this.success = 'Product deleted successfully!';
          setTimeout(() => this.success = null, 3000);
          this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Error deleting product:', err);
          this.loading = false;
          this.error = 'Error deleting product: ' + (err.error?.message || err.message);
          setTimeout(() => this.error = null, 5000);
        }
      });
    }
  }

  cancelEdit(): void {
    this.showAddForm = false;
    this.editingProduct = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.newProduct = {
      name: '',
      description: '',
      categoryName: this.categoryName,
      price: 0,
      variantPrice: 0,
      variantQuantity: 10,
      variantColor: '',
      variantSize: ''
    };
    this.selectedImages = [];
    this.previewImages = [];
    this.imagePreviews = [];
  }

  getStockCount(product: Product): number {
    return product.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0;
  }

  getStockStatus(product: Product): string {
    const stock = this.getStockCount(product);
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return 'Low Stock';
    return 'In Stock';
  }

  getStockClass(product: Product): string {
    const stock = this.getStockCount(product);
    if (stock === 0) return 'stock-out';
    if (stock < 10) return 'stock-low';
    return 'stock-in';
  }
}
