export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};
