import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Governorate {
  id: number;
  nameAr: string;
  nameEn: string;
  shippingCost: number;
}

export interface UpdateShippingCostDto {
  shippingCost: number;
}

@Injectable({
  providedIn: 'root'
})
export class GovernorateService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/governorate`;

  /**
   * Get all governorates
   */
  getAllGovernorates(): Observable<Governorate[]> {
    return this.http.get<Governorate[]>(this.apiUrl);
  }

  /**
   * Get governorate by ID
   */
  getGovernorateById(id: number): Observable<Governorate> {
    return this.http.get<Governorate>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update shipping cost for a governorate (Admin only)
   */
  updateShippingCost(id: number, shippingCost: number): Observable<any> {
    const dto: UpdateShippingCostDto = { shippingCost };
    return this.http.put(`${this.apiUrl}/${id}/shipping`, dto);
  }
}
