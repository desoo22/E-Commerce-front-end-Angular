import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GovernorateService, Governorate } from '../../../core/services/governorate.service';

@Component({
  selector: 'app-admin-shipping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shipping.component.html',
  styleUrl: './admin-shipping.component.css'
})
export class AdminShippingComponent implements OnInit {
  private governorateService = inject(GovernorateService);
  
  governorates: Governorate[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;
  editingId: number | null = null;
  editingCost: number = 0;

  ngOnInit(): void {
    this.loadGovernorates();
  }

  loadGovernorates(): void {
    this.loading = true;
    this.error = null;
    this.governorateService.getAllGovernorates().subscribe({
      next: (data) => {
        this.governorates = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading governorates:', err);
        this.error = 'Failed to load governorates';
        this.loading = false;
      }
    });
  }

  startEdit(governorate: Governorate): void {
    this.editingId = governorate.id;
    this.editingCost = governorate.shippingCost;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingCost = 0;
  }

  saveShippingCost(governorate: Governorate): void {
    if (this.editingCost < 0) {
      this.error = 'Shipping cost cannot be negative';
      return;
    }

    this.governorateService.updateShippingCost(governorate.id, this.editingCost).subscribe({
      next: () => {
        this.success = `Shipping cost updated for ${governorate.nameEn}`;
        governorate.shippingCost = this.editingCost;
        this.editingId = null;
        setTimeout(() => this.success = null, 3000);
      },
      error: (err) => {
        console.error('❌ Error updating shipping cost:', err);
        this.error = err.error?.message || 'Failed to update shipping cost';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  isEditing(id: number): boolean {
    return this.editingId === id;
  }
}
