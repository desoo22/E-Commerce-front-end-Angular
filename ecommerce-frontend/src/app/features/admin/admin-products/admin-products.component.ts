import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.css'
})
export class AdminProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);
  
  products: any[] = [];
  loading = false;
  error: string | null = null;
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
    console.log('🚀 AdminProductsComponent initialized!');
    console.log('🚀 Calling loadProducts...');
    this.loadProducts();
    console.log('🚀 loadProducts() called, loading=', this.loading);
  }

  loadProducts(): void {
    console.log('📦 Loading admin products...');
    this.loading = true;
    this.cdr.detectChanges();
    
    // Try using the regular products endpoint instead
    this.productService.getProducts().subscribe({
      next: (items) => {
        console.log('✅ Products API response received:', items);
        console.log('✅ Response type:', typeof items, 'Is array:', Array.isArray(items));
        console.log('✅ Items count:', items?.length);
        
        this.products = items || [];
        console.log('📊 Products array updated. Length:', this.products.length);
        this.loading = false;
        this.cdr.detectChanges();
        console.log('✅ UI updated, loading=false');
      },
      error: (err) => {
        console.error('❌ Failed to load products', err);
        console.error('❌ Error status:', err.status);
        console.error('❌ Error body:', err.error);
        this.loading = false;
        this.error = 'Failed to load products: ' + (err.error?.message || err.message || err.status);
        this.cdr.detectChanges();
      }
    });
  }

  addProduct(): void {
    this.showAddForm = true;
    this.editingProduct = null;
    this.resetForm();
  }

  editProduct(product: any): void {
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
    this.selectedImages = [];
    this.previewImages = product.images?.map((img: any) => img.imageData || img.imageUrl) || [];
    this.imagePreviews = [...this.previewImages];
  }

  saveProduct(): void {
    if (!this.newProduct.name || !this.newProduct.description || !this.newProduct.categoryName || !this.newProduct.price) {
      alert('Please fill all required fields: Name, Description, Category, and Price');
      return;
    }

    if (this.editingProduct) {
      const productData = {
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
        }],
        images: this.imagePreviews.map(preview => ({
          imageData: preview
        }))
      };

      console.log('Updating product:', productData);

      this.productService.updateProduct(this.editingProduct.id, productData).subscribe({
        next: () => {
          alert('Product updated successfully!');
          this.productService.clearCache(); // Clear cache after update
          this.cancelEdit();
          this.loadProducts();
        },
        error: (err) => {
          console.error('Update error:', err);
          alert('Error updating product: ' + (err.error?.message || err.message || 'Unknown error'));
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
          alert('Product created successfully!');
          this.productService.clearCache(); // Clear cache after creation
          this.cancelEdit();
          this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Create error:', err);
          alert('Error creating product: ' + (err.error?.message || err.message || `HTTP ${err.status}`));
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
          alert('Product deleted successfully!');
          this.productService.clearCache(); // Clear cache after deletion
          this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Error deleting product:', err);
          this.loading = false;
          alert('Error deleting product: ' + (err.error?.message || err.message || 'Unknown error'));
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
      categoryName: '',
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
}
