export interface ICreateInventoryRequest {
  outletId: string;
  menuItemId: string;
  quantity: number;
  threshold?: number;
}

export interface IUpdateQuantityRequest {
  quantity: number;
}

export interface IQueryInventory {
  outletId?: string;
  menuItemId?: string;
  limit?: string;
  page?: string;
}

export interface IQueryLowStock {
  outletId?: string;
  limit?: string;
  page?: string;
}
