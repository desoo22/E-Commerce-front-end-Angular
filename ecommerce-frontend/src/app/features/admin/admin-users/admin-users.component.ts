import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent {
  private apiService = inject(ApiService);
  
  promoteEmail = '';
  demoteEmail = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  promoteUser(): void {
    if (!this.promoteEmail.trim()) return;

    this.apiService.post('auth/promote', { email: this.promoteEmail }).subscribe({
      next: () => {
        this.showMessage('User promoted to Admin successfully', 'success');
        this.promoteEmail = '';
      },
      error: (err) => {
        this.showMessage('Failed to promote user: ' + (err.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  demoteUser(): void {
    if (!this.demoteEmail.trim()) return;

    this.apiService.post('auth/demote', { email: this.demoteEmail }).subscribe({
      next: () => {
        this.showMessage('Admin demoted to User successfully', 'success');
        this.demoteEmail = '';
      },
      error: (err) => {
        this.showMessage('Failed to demote user: ' + (err.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }
}
