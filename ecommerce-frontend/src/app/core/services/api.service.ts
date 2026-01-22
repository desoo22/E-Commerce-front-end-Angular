import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private readonly requestTimeoutMs = 60000; // 60 seconds (increase to allow large base64 image payloads)

  constructor(private http: HttpClient) {}

  // Get request
  get<T>(endpoint: string): Observable<T> {
    const fullUrl = `${this.apiUrl}/${endpoint}`;
    
    // For public endpoints (product, category, etc without /all), don't send token
    // Only protected endpoints like /all need token
    const isProtectedEndpoint = endpoint.includes('/all') || 
                                endpoint.includes('admin') ||
                                endpoint.includes('user') ||
                                endpoint.includes('order') ||
                                endpoint.includes('cart');
    
    const token = isProtectedEndpoint ? this.getToken() : null;
    
    console.log(`🔍 GET ${endpoint} - Protected: ${isProtectedEndpoint}, Token: ${token ? '✅ exists' : '❌ missing'}`);
    console.log(`📍 Full URL: ${fullUrl}`);
    if (token) {
      console.log(`🔑 Token: ${token.substring(0, 100)}...`);
      console.log(`📌 Token preview: ${token.substring(0, 50)}...`);
      console.log(`📋 Full token length: ${token.length} chars`);
      const authHeader = `Bearer ${token}`;
      console.log(`🔐 Authorization header (first 100 chars): ${authHeader.substring(0, 100)}...`);
    }
    const headers = this.getHeaders(token);
    return this.http.get<T>(fullUrl, { headers }).pipe(timeout(this.requestTimeoutMs));
  }

  // POST request
  post<T>(endpoint: string, data: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 POST ${endpoint} - Token: ${token ? '✅ exists (' + token.substring(0, 20) + '...)' : '❌ missing'}`);
    
    let headers = new HttpHeaders();
    
    // ALWAYS add Authorization if token exists
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('✅ Authorization header added');
    } else {
      console.warn('⚠️ No token found - request will likely fail with 401');
    }
    
    // If data is FormData, don't set Content-Type (browser will set it automatically with boundary)
    if (data instanceof FormData) {
      console.log('📤 Sending FormData - letting browser set Content-Type');
      return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, { headers }).pipe(timeout(this.requestTimeoutMs));
    }
    
    // Otherwise set Content-Type to application/json
    headers = headers.set('Content-Type', 'application/json');
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, { headers }).pipe(timeout(this.requestTimeoutMs));
  }

  // PUT request
  put<T>(endpoint: string, data: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 PUT ${endpoint} - Token: ${token ? '✅ exists (' + token.substring(0, 20) + '...)' : '❌ missing'}`);
    
    let headers = new HttpHeaders();
    
    // ALWAYS add Authorization if token exists
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('✅ Authorization header added');
    }
    
    // If data is FormData, don't set Content-Type (browser will set it automatically)
    if (data instanceof FormData) {
      console.log('📤 Sending FormData - letting browser set Content-Type');
      return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data, { headers }).pipe(timeout(this.requestTimeoutMs));
    }
    
    // Otherwise set Content-Type to application/json
    headers = headers.set('Content-Type', 'application/json');
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data, { headers }).pipe(timeout(this.requestTimeoutMs));
  }

  // DELETE request (with optional body)
  delete<T>(endpoint: string, data?: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 DELETE ${endpoint} - Token: ${token ? '✅ exists' : '❌ missing'}`);
    const headers = this.getHeaders(token);
    const url = `${this.apiUrl}/${endpoint}`;
    return this.http.delete<T>(url, { headers, body: data }).pipe(timeout(this.requestTimeoutMs));
  }

  // Get token from localStorage
  private getToken(): string | null {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('⚠️ No accessToken in localStorage');
      console.log('Available keys in localStorage:', Object.keys(localStorage));
    }
    return token;
  }

  // Build headers with Authorization if token exists
  private getHeaders(token: string | null): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      const preview = token.substring(0, 50) + '...';
      console.log(`📌 Token preview: ${preview}`);
      console.log(`📋 Full token length: ${token.length} chars`);
      const authHeader = `Bearer ${token}`;
      console.log(`🔐 Authorization header (first 100 chars): ${authHeader.substring(0, 100)}...`);
      headers = headers.set('Authorization', authHeader);
    } else {
      console.warn('⚠️ No token found in localStorage');
    }

    return headers;
  }
}
