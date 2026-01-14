import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartUtilsService {
  constructor() {}

  decreaseQuantity(item: any): void {
    if (item.quantity > 1) {
      item.quantity--;
    }
  }

  increaseQuantity(item: any): void {
    item.quantity++;
  }
}
