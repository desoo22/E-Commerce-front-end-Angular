import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.css'
})
export class AdminCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private cdr = inject(ChangeDetectorRef);
  
  categories: any[] = [];
  loading = false;
  showAddForm = false;
  editingCategory: any = null;

  newCategory = {
    name: '',
    description: ''
  };

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  addCategory(): void {
    this.showAddForm = true;
    this.editingCategory = null;
    this.resetForm();
  }

  editCategory(category: any): void {
    this.showAddForm = true;
    this.editingCategory = category;
    this.newCategory = { ...category };
  }

  saveCategory(): void {
    if (!this.newCategory.name) {
      alert('Please enter a category name');
      return;
    }

    if (this.editingCategory) {
      // Update existing category
      this.categoryService.updateCategory(this.editingCategory.id, this.newCategory).subscribe({
        next: () => {
          this.cancelEdit();
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error updating category:', err);
          alert('Failed to update category');
        }
      });
    } else {
      // Add new category
      this.categoryService.addCategory(this.newCategory).subscribe({
        next: () => {
          this.cancelEdit();
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error creating category:', err);
          alert('Failed to create category');
        }
      });
    }
  }

  deleteCategory(id: number): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error deleting category:', err);
          alert('Failed to delete category');
        }
      });
    }
  }

  cancelEdit(): void {
    this.showAddForm = false;
    this.editingCategory = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.newCategory = {
      name: '',
      description: ''
    };
  }
}
