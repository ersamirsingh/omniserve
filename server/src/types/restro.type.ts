import { ParamsDictionary } from 'express-serve-static-core';

export interface RestaurantParams extends ParamsDictionary {
  id: string;
}

