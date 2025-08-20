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

export interface RecipeItemProps {
  recipe: Recipe;
  isFavorite: boolean;
  favoriteAnimation?: any; // Animated.Value
  showFoodAnimation: boolean;
  foodAnimations: any[]; // Animated.Value[]
  onToggleFavorite: (recipeId: number) => void;
  onAddToShoppingList: (recipeId: number) => void;
}
