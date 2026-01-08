import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get request
  get<T>(endpoint: string): Observable<T> {
    const token = this.getToken();
    const fullUrl = `${this.apiUrl}/${endpoint}`;
    console.log(`🔍 GET ${endpoint} - Token: ${token ? '✅ exists' : '❌ missing'}`);
    console.log(`📍 Full URL: ${fullUrl}`);
    if (token) {
      console.log(`🔑 Token: ${token.substring(0, 100)}...`);
      console.log(`📌 Token preview: ${token.substring(0, 50)}...`);
      console.log(`📋 Full token length: ${token.length} chars`);
      const authHeader = `Bearer ${token}`;
      console.log(`🔐 Authorization header (first 100 chars): ${authHeader.substring(0, 100)}...`);
    }
    const headers = this.getHeaders(token);
    return this.http.get<T>(fullUrl, { headers });
  }

  // POST request
  post<T>(endpoint: string, data: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 POST ${endpoint} - Token: ${token ? '✅ exists' : '❌ missing'}`);
    
    // For FormData, don't set Content-Type header (browser will set it with boundary)
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    // If data is FormData, don't set Content-Type
    if (data instanceof FormData) {
      return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, { headers });
    }
    
    // Otherwise set Content-Type to application/json
    headers = headers.set('Content-Type', 'application/json');
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, { headers });
  }

  // PUT request
  put<T>(endpoint: string, data: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 PUT ${endpoint} - Token: ${token ? '✅ exists' : '❌ missing'}`);
    const headers = this.getHeaders(token);
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data, { headers });
  }

  // DELETE request (with optional body)
  delete<T>(endpoint: string, data?: any): Observable<T> {
    const token = this.getToken();
    console.log(`🔍 DELETE ${endpoint} - Token: ${token ? '✅ exists' : '❌ missing'}`);
    const headers = this.getHeaders(token);
    const url = `${this.apiUrl}/${endpoint}`;
    return this.http.delete<T>(url, { headers, body: data });
  }

  // Get token from localStorage
  private getToken(): string | null {
    const token = localStorage.getItem('accessToken');
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
