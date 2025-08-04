import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoriteRecipe, Ingredient, Recipe, RecipeIngredient, RecipeTag, ShoppingListItem, Tag } from '../types';

// Clés de stockage
const STORAGE_KEYS = {
  RECIPES: 'recipes',
  INGREDIENTS: 'ingredients',
  RECIPE_INGREDIENTS: 'recipe_ingredients',
  TAGS: 'tags',
  RECIPE_TAGS: 'recipe_tags',
  SHOPPING_LIST: 'shoppingList',
  FAVORITES: 'favorites',
};

// Fonctions génériques
const getItem = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return [];
  }
};

const setItem = async <T>(key: string, value: T[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
  }
};

// Gestionnaire de recettes
export const RecipeManager = {
  getRecipes: () => getItem<Recipe>(STORAGE_KEYS.RECIPES),
  saveRecipe: async (recipe: Recipe) => {
    const recipes = await getItem<Recipe>(STORAGE_KEYS.RECIPES);
    const index = recipes.findIndex(r => r.id === recipe.id);
    if (index !== -1) {
      // Mise à jour d'une recette existante
      recipes[index] = recipe;
    } else {
      // Nouvelle recette
      recipes.push(recipe);
    }
    await setItem(STORAGE_KEYS.RECIPES, recipes);
  },
  getRecipeById: async (id: number): Promise<Recipe | undefined> => {
    const recipes = await getItem<Recipe>(STORAGE_KEYS.RECIPES);
    return recipes.find(recipe => recipe.id === id);
  },
  deleteRecipe: async (id: number): Promise<void> => {
    const recipes = await getItem<Recipe>(STORAGE_KEYS.RECIPES);
    await setItem(STORAGE_KEYS.RECIPES, recipes.filter(recipe => recipe.id !== id));
  },
};

// Gestionnaire d'ingrédients
export const IngredientManager = {
  getIngredients: () => getItem<Ingredient>(STORAGE_KEYS.INGREDIENTS),
  saveIngredient: async (ingredient: Ingredient) => {
    const ingredients = await getItem<Ingredient>(STORAGE_KEYS.INGREDIENTS);
    ingredients.push(ingredient);
    await setItem(STORAGE_KEYS.INGREDIENTS, ingredients);
  },
};

// Gestionnaire de la liaison recettes-ingrédients
export const RecipeIngredientManager = {
  getRecipeIngredients: () => getItem<RecipeIngredient>(STORAGE_KEYS.RECIPE_INGREDIENTS),
  getIngredientsForRecipe: async (recipeId: number): Promise<RecipeIngredient[]> => {
    const recipeIngredients = await getItem<RecipeIngredient>(STORAGE_KEYS.RECIPE_INGREDIENTS);
    return recipeIngredients.filter(ri => ri.recipeId === recipeId);
  },
  saveRecipeIngredient: async (recipeIngredient: RecipeIngredient) => {
    const recipeIngredients = await getItem<RecipeIngredient>(STORAGE_KEYS.RECIPE_INGREDIENTS);
    recipeIngredients.push(recipeIngredient);
    await setItem(STORAGE_KEYS.RECIPE_INGREDIENTS, recipeIngredients);
  },
  getRecipesForIngredient: async (ingredientId: number): Promise<Recipe[]> => {
    const recipeIngredients = await getItem<RecipeIngredient>(STORAGE_KEYS.RECIPE_INGREDIENTS);
    const recipes = await getItem<Recipe>(STORAGE_KEYS.RECIPES);
    const recipeIds = recipeIngredients
      .filter(ri => ri.ingredientId === ingredientId)
      .map(ri => ri.recipeId);
    return recipes.filter(recipe => recipeIds.includes(recipe.id));
  },
};

// Tags prédéfinis
const PREDEFINED_TAGS: Tag[] = [
  { id: 1, name: 'healthy' },
  { id: 2, name: 'dessert' },
  { id: 3, name: 'plat' },
  { id: 4, name: 'cocktail' },
  { id: 5, name: 'rapide' },
  { id: 6, name: 'pas cher' },
  { id: 7, name: 'veggie' },
  { id: 8, name: 'vegan' },
];

// Gestionnaire de tags
export const TagManager = {
  getTags: async (): Promise<Tag[]> => {
    // Retourner toujours les tags prédéfinis
    return PREDEFINED_TAGS;
  },
  initializeTags: async () => {
    // Initialiser les tags prédéfinis s'ils n'existent pas déjà
    await setItem(STORAGE_KEYS.TAGS, PREDEFINED_TAGS);
  },
};

// Gestionnaire de la liaison recettes-tags
export const RecipeTagManager = {
  getRecipeTags: () => getItem<RecipeTag>(STORAGE_KEYS.RECIPE_TAGS),
  getTagsForRecipe: async (recipeId: number): Promise<RecipeTag[]> => {
    const recipeTags = await getItem<RecipeTag>(STORAGE_KEYS.RECIPE_TAGS);
    return recipeTags.filter(rt => rt.recipeId === recipeId);
  },
  saveRecipeTag: async (recipeTag: RecipeTag) => {
    const recipeTags = await getItem<RecipeTag>(STORAGE_KEYS.RECIPE_TAGS);
    recipeTags.push(recipeTag);
    await setItem(STORAGE_KEYS.RECIPE_TAGS, recipeTags);
  },
};

// Gestionnaire de la liste de courses
export const ShoppingListManager = {
  getShoppingList: () => getItem<ShoppingListItem>(STORAGE_KEYS.SHOPPING_LIST),
  saveShoppingList: (items: ShoppingListItem[]) => setItem(STORAGE_KEYS.SHOPPING_LIST, items),
  addRecipeToShoppingList: async (recipeId: number) => {
    const recipeIngredients = await RecipeIngredientManager.getIngredientsForRecipe(recipeId);
    const currentList = await getItem<ShoppingListItem>(STORAGE_KEYS.SHOPPING_LIST);
    const ingredients = await IngredientManager.getIngredients();
    
    const updatedList = [...currentList];
    
    // Fonction pour normaliser les noms d'ingrédients pour la comparaison
    const normalizeIngredientName = (name: string): string => {
      return name.toLowerCase()
        .replace(/s$/, '') // Enlever le 's' final (pluriel)
        .replace(/x$/, '') // Enlever le 'x' final (pluriel)
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
    };
    
    recipeIngredients.forEach(ri => {
      const ingredient = ingredients.find(i => i.id === ri.ingredientId);
      if (!ingredient) return;
      
      const normalizedNewName = normalizeIngredientName(ingredient.name);
      
      // Chercher si un ingrédient similaire existe déjà dans la liste
      const existingItemIndex = updatedList.findIndex(item => {
        const normalizedExistingName = normalizeIngredientName(item.name);
        return normalizedExistingName === normalizedNewName && item.unit === ri.unit;
      });
      
      if (existingItemIndex !== -1) {
        // L'ingrédient existe avec la même unité, augmenter la quantité et ajouter la recette
        updatedList[existingItemIndex].quantity += ri.quantity;
        if (!updatedList[existingItemIndex].recipeIds) {
          updatedList[existingItemIndex].recipeIds = [];
        }
        if (!updatedList[existingItemIndex].recipeIds!.includes(recipeId)) {
          updatedList[existingItemIndex].recipeIds!.push(recipeId);
        }
      } else {
        // Nouvel ingrédient, l'ajouter à la liste
        updatedList.push({
          id: Date.now() + Math.random(),
          name: ingredient.name,
          quantity: ri.quantity,
          unit: ri.unit,
          checked: false,
          recipeIds: [recipeId],
        });
      }
    });
    
    await setItem(STORAGE_KEYS.SHOPPING_LIST, updatedList);
  },
};

// Gestionnaire de favoris
export const FavoriteManager = {
  getFavorites: () => getItem<FavoriteRecipe>(STORAGE_KEYS.FAVORITES),
  addFavorite: async (recipeId: number) => {
    const favorites = await getItem<FavoriteRecipe>(STORAGE_KEYS.FAVORITES);
    const existingFavorite = favorites.find(f => f.recipeId === recipeId);
    if (!existingFavorite) {
      favorites.push({
        recipeId,
        addedAt: new Date(),
      });
      await setItem(STORAGE_KEYS.FAVORITES, favorites);
    }
  },
  removeFavorite: async (recipeId: number) => {
    const favorites = await getItem<FavoriteRecipe>(STORAGE_KEYS.FAVORITES);
    const updatedFavorites = favorites.filter(f => f.recipeId !== recipeId);
    await setItem(STORAGE_KEYS.FAVORITES, updatedFavorites);
  },
  isFavorite: async (recipeId: number): Promise<boolean> => {
    const favorites = await getItem<FavoriteRecipe>(STORAGE_KEYS.FAVORITES);
    return favorites.some(f => f.recipeId === recipeId);
  },
};
