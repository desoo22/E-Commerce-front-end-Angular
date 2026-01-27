import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Skip auth header for auth endpoints
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // Add Authorization header if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          // Try to refresh token
          return authService.refreshToken({ refreshToken }).pipe(
            switchMap((response) => {
              // Retry original request with new token
              const newToken = response.accessToken || response.token;
              if (newToken) {
                const clonedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(clonedReq);
              }
              // If no token in response, logout
              authService.logout().subscribe();
              router.navigate(['/login']);
              return throwError(() => error);
            }),
            catchError((refreshError) => {
              // Refresh failed, force logout
              authService.logout().subscribe();
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        } else {
          // No refresh token, force logout
          authService.logout().subscribe();
          router.navigate(['/login']);
        }
      }
      
      return throwError(() => error);
    })
  );
};
