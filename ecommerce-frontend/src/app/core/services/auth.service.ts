import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';

export interface AuthResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  userId?: number;
  id?: number;
  role?: string;
}

export interface RequestOtpDto {
  email: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface RefreshRequestDto {
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.isTokenValid());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<{ userId: number | null; role: string | null } | null>(this.getCurrentUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private apiService: ApiService) {}

  // Request OTP
  requestOtp(dto: RequestOtpDto): Observable<any> {
    return this.apiService.post('auth/request-otp', dto);
  }

  // Verify OTP and login
  verifyOtp(dto: VerifyOtpDto): Observable<any> {
    console.log('🔐 Calling verifyOtp API...');
    return this.apiService.post<any>('auth/verify-otp', dto).pipe(
        tap((response: any) => {
            console.log('✅ Verify OTP Response:', response);
            console.log('🔍 Extracting tokens from response...');
            const accessToken = response.accessToken || response.token || '';
            const refreshToken = response.refreshToken || '';
            const userId = response.userId ?? response.id ?? null;
            const role = response.role || '';
            
            console.log('🔑 Access Token:', accessToken ? accessToken.substring(0, 30) + '...' : 'MISSING');
            console.log('👤 User ID:', userId, 'Role:', role);

            this.storeTokens({ accessToken, refreshToken, userId, role });
            this.isAuthenticatedSubject.next(true);
            console.log('✅ Authentication complete - token stored in localStorage');
            
            // Verify it's actually saved
            const saved = localStorage.getItem('accessToken');
            console.log('✅ Token verification - saved:', saved ? 'YES (' + saved.substring(0, 30) + '...)' : 'NO');
        })
    );
  }

  // Refresh token
  refreshToken(dto: RefreshRequestDto): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('auth/refresh', dto).pipe(
      tap((response: AuthResponse) => {
        this.storeTokens(response);
      })
    );
  }

  // Logout
  logout(): Observable<void> {
    return this.apiService.post<void>('auth/logout', {}).pipe(
      tap(() => {
        console.log('✅ Logged out from backend');
        this.clearTokens();
        this.isAuthenticatedSubject.next(false);
        console.log('✅ Local session cleared');
      }),
      catchError((err) => {
        console.error('❌ Logout error:', err);
        // Clear tokens anyway even if request fails
        this.clearTokens();
        this.isAuthenticatedSubject.next(false);
        return of(void 0);
      })
    );
  }

  // Store tokens in localStorage
  private storeTokens(response: any): void {
    const accessToken = response.accessToken || response.token || '';
    const refreshToken = response.refreshToken || '';
    const userId = response.userId ?? response.id ?? null;
    const role = response.role || '';

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (userId !== null) {
      localStorage.setItem('userId', userId.toString());
    }
    localStorage.setItem('userRole', role);
    
    this.currentUserSubject.next({ userId, role });
  }

  // Clear tokens from localStorage
  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    this.currentUserSubject.next(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  }

  // Check if token is valid
  private isTokenValid(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  // Get current user ID
  getUserId(): number | null {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : null;
  }

  // Get current user role
  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isTokenValid();
  }

  // Decode JWT token to inspect claims
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ Invalid JWT format');
        return null;
      }
      const decoded = JSON.parse(atob(parts[1]));
      return decoded;
    } catch (error) {
      console.error('❌ Error decoding JWT:', error);
      return null;
    }
  }

  // Get current user from storage
  private getCurrentUserFromStorage(): { userId: number | null; role: string | null } | null {
    const userId = this.getUserId();
    const role = this.getUserRole();
    return (userId !== null || role !== null) ? { userId, role } : null;
  }

  // Get current user synchronously
  getCurrentUser(): { userId: number | null; role: string | null } | null {
    return this.currentUserSubject.value;
  }
}
