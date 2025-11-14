import {CleanBrand} from "./clean-brand";
import {CleanCategory} from "./clean-category";
import {CleanProductVariant} from "../product-variants.service";

export interface CleanProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;

  brand: CleanBrand | null;

  categories: CleanCategory[];

  variants: CleanProductVariant[];

  createdAt: Date;
  updatedAt: Date;
}
