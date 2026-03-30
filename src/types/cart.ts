export type CartItem = {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  removedIngredients?: string[];
  addedIngredients?: string[];
  itemNote?: string | null;
};
