import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RecipeItem } from "../src/components";
import { FavoriteManager, RecipeManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Recipe } from "../src/types";

export default function FavoritesPage() {
  const router = useRouter();
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [foodAnimations, setFoodAnimations] = useState<{[key: number]: boolean}>({});

  // Animations pour les favoris
  const favoriteAnimationRefs = useRef<{[key: number]: Animated.Value}>({});
  
  // Animations pour les icônes de nourriture
  const foodAnimationRefs = useRef<{[key: number]: Animated.Value[]}>({});

  useEffect(() => {
    loadFavoriteRecipes();
  }, []);

  // Recharger les favoris à chaque fois qu'on revient sur la page
  useFocusEffect(
    useCallback(() => {
      loadFavoriteRecipes();
    }, [])
  );

  const loadFavoriteRecipes = async () => {
    try {
      const favoriteList = await FavoriteManager.getFavorites();
      const favoriteIds = favoriteList.map(f => f.recipeId);
      setFavorites(new Set(favoriteIds));
      
      // Charger les recettes complètes pour chaque favori
      const recipes = await RecipeManager.getRecipes();
      const favoriteRecipesList = recipes.filter(recipe => favoriteIds.includes(recipe.id));
      setFavoriteRecipes(favoriteRecipesList);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const addToShoppingList = async (recipeId: number) => {
    try {
      const { ShoppingListManager, RecipeIngredientManager } = await import("../src/services/storage");
      
      // Vérifier d'abord si la recette a des ingrédients
      const recipeIngredients = await RecipeIngredientManager.getIngredientsForRecipe(recipeId);
      
      if (recipeIngredients.length === 0) {
        alert('Cette recette n\'a pas d\'ingrédients définis. Veuillez d\'abord modifier la recette pour ajouter des ingrédients.');
        return;
      }
      
      await ShoppingListManager.addRecipeToShoppingList(recipeId);
      
      // Déclencher l'animation des icônes de nourriture
      triggerFoodAnimation(recipeId);
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la liste:', error);
      alert('Erreur lors de l\'ajout à la liste de courses');
    }
  };

  const triggerFavoriteAnimation = (recipeId: number) => {
    // Créer l'animation pour ce favori si elle n'existe pas
    if (!favoriteAnimationRefs.current[recipeId]) {
      favoriteAnimationRefs.current[recipeId] = new Animated.Value(1);
    }

    const animation = favoriteAnimationRefs.current[recipeId];
    
    // Animation de pulsation
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const triggerFoodAnimation = (recipeId: number) => {
    // Créer les animations pour les 3 icônes si elles n'existent pas
    if (!foodAnimationRefs.current[recipeId]) {
      foodAnimationRefs.current[recipeId] = [
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0)
      ];
    }

    // Afficher les icônes pour cette recette
    setFoodAnimations(prev => ({ ...prev, [recipeId]: true }));

    const animations = foodAnimationRefs.current[recipeId];
    
    // Lancer les animations en parallèle avec des délais différents
    Animated.stagger(150, animations.map((anim, index) => 
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    )).start(() => {
      // Cacher les icônes après l'animation
      setFoodAnimations(prev => ({ ...prev, [recipeId]: false }));
      // Réinitialiser les animations
      animations.forEach(anim => anim.setValue(0));
    });
  };

  const toggleFavorite = async (recipeId: number) => {
    try {
      if (favorites.has(recipeId)) {
        await FavoriteManager.removeFavorite(recipeId);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
        // Recharger la liste après suppression
        loadFavoriteRecipes();
      } else {
        await FavoriteManager.addFavorite(recipeId);
        setFavorites(prev => new Set([...prev, recipeId]));
      }
      
      // Déclencher l'animation après la mise à jour
      triggerFavoriteAnimation(recipeId);
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  const renderRecipe = ({ item: recipe }: { item: Recipe }) => {
    const favoriteAnimation = favoriteAnimationRefs.current[recipe.id];
    const showAnimation = foodAnimations[recipe.id];
    const animations = foodAnimationRefs.current[recipe.id] || [];

    return (
      <RecipeItem
        recipe={recipe}
        isFavorite={favorites.has(recipe.id)}
        favoriteAnimation={favoriteAnimation}
        showFoodAnimation={showAnimation}
        foodAnimations={animations}
        onToggleFavorite={toggleFavorite}
        onAddToShoppingList={addToShoppingList}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome name="arrow-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Mes Favoris</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {favoriteRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="heart-o" size={64} color={theme.colors.textLight} />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez des recettes à vos favoris pour les retrouver ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoriteRecipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          style={styles.recipesList}
          contentContainerStyle={styles.recipesContent}
          columnWrapperStyle={styles.recipeRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.small,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  recipesList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  
  recipesContent: {
    paddingBottom: theme.spacing.xl,
  },
  
  recipeRow: {
    gap: theme.spacing.md,
  },
});
