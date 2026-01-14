import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  profileImage?: string;
  role: string;
}

export interface UpdateProfileDto {
  name?: string;
  profileImage?: string;
}

export interface UserCart {
  items: any[];
  totalPrice: number;
  totalQuantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private apiService: ApiService) {}

  // ========================= Profile =========================
  
  // Get user profile
  getProfile(): Observable<UserProfile> {
    return this.apiService.get<UserProfile>('user/profile');
  }

  // Update user profile
  updateProfile(dto: UpdateProfileDto): Observable<any> {
    return this.apiService.put('user/profile', dto);
  }

  // Upload profile image
  uploadProfileImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService.post('user/profile/upload-image', formData);
  }

  // ========================= Cart =========================
  
  // Get user's cart (alternative endpoint)
  getCart(): Observable<UserCart> {
    return this.apiService.get<UserCart>('user/cart');
  }

  // ========================= Orders =========================
  
  // Get user's orders
  getOrders(): Observable<any> {
    return this.apiService.get<any>('user/orders');
  }
}
