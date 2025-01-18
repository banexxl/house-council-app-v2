export interface Product {
  id: string;
  attributes: string[];
  category: string;
  created_at: number;
  currency: string;
  image: string | null;
  inStock: boolean;
  isAvailable: boolean;
  isShippable: boolean;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  status: 'published' | 'draft';
  updated_at: number;
  variants: number;
}
