export interface Recipe {
  id: number;
  name: string;
  description: string;
  imageUri: string;
  steps: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  id: number;
  name: string;
}

export interface RecipeIngredient {
  recipeId: number;
  ingredientId: number;
  quantity: number;
  unit: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface RecipeTag {
  recipeId: number;
  tagId: number;
}

export interface ShoppingListItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  checked: boolean;
  recipeIds?: number[];
}

export interface FavoriteRecipe {
  recipeId: number;
  addedAt: Date;
}
