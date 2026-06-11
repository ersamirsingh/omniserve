export interface ICreateCategoryRequest {
  outletId: string;
  name: string;
  displayOrder?: number;
}

export interface IPutCategoryRequest {
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IUpdateOrderRequest {
  displayOrder: number;
}

export interface IQueryCategories {
  outletId?: string;
  page?: string;
  limit?: string;
}
