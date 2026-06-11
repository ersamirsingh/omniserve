export interface ICreateMenuItemRequest {
  categoryId: string;
  outletId: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  sku?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface IPutMenuItemRequest {
  categoryId: string;
  outletId: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  sku?: string;
  isVeg: boolean;
  isAvailable: boolean;
  displayOrder: number;
}

export interface IToggleAvailabilityRequest {
  isAvailable: boolean;
}

export interface IQueryMenuItems {
  outletId?: string;
  categoryId?: string;
  search?: string;
  page?: string;
  limit?: string;
}
