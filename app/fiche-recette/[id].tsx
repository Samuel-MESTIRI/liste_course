import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { FavoriteManager, IngredientManager, RecipeIngredientManager, RecipeManager, RecipeTagManager, TagManager } from "../../src/services/storage";
import { theme } from "../../src/styles/theme";
import { Ingredient, Recipe, RecipeIngredient, Tag } from "../../src/types";

export default function FicheRecettePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const recipeId = parseInt(id as string);
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<(RecipeIngredient & { ingredient: Ingredient })[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRecipeData();
  }, [recipeId]);

  // Recharger les données à chaque fois qu'on revient sur la page
  useFocusEffect(
    useCallback(() => {
      loadRecipeData();
    }, [recipeId])
  );

  const loadRecipeData = async () => {
    try {
      setLoading(true);
      
      // Charger la recette
      const recipeData = await RecipeManager.getRecipe(recipeId);
      setRecipe(recipeData);

      // Charger les ingrédients
      const recipeIngredients = await RecipeIngredientManager.getIngredientsForRecipe(recipeId);
      const ingredientsWithDetails = [];
      
      for (const ri of recipeIngredients) {
        const ingredient = await IngredientManager.getIngredient(ri.ingredientId);
        if (ingredient) {
          ingredientsWithDetails.push({
            ...ri,
            ingredient
          });
        }
      }
      setIngredients(ingredientsWithDetails);

      // Charger les tags
      const recipeTags = await RecipeTagManager.getTagsForRecipe(recipeId);
      const tagsWithDetails = [];
      
      for (const rt of recipeTags) {
        const tag = await TagManager.getTag(rt.tagId);
        if (tag) {
          tagsWithDetails.push(tag);
        }
      }
      setTags(tagsWithDetails);

      // Vérifier si c'est un favori
      const favorites = await FavoriteManager.getFavorites();
      setIsFavorite(favorites.some(f => f.recipeId === recipeId));

    } catch (error) {
      console.error('Erreur lors du chargement de la recette:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await FavoriteManager.removeFavorite(recipeId);
        setIsFavorite(false);
      } else {
        await FavoriteManager.addFavorite(recipeId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  if (loading || !recipe) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.name}
        </Text>
        
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={toggleFavorite}
        >
          <FontAwesome
            name={isFavorite ? "heart" : "heart-o"}
            size={24}
            color={isFavorite ? theme.colors.error : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image de la recette */}
        {recipe.imageUri ? (
          <Image
            source={{ uri: recipe.imageUri }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <FontAwesome name="image" size={48} color={theme.colors.textLight} />
          </View>
        )}

        <View style={styles.recipeContent}>
          {/* Description */}
          {recipe.description && (
            <View style={styles.section}>
              <Text style={styles.recipeDescription}>{recipe.description}</Text>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <View key={tag.id} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ingrédients */}
          {ingredients.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Ingrédients</Text>
              {ingredients.map((item, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text style={styles.ingredientText}>
                    • {item.quantity} {item.unit} {item.ingredient.name}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Étapes */}
          {recipe.steps && recipe.steps.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Étapes de préparation</Text>
              {recipe.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Bouton Modifier */}
          <View style={styles.actionSection}>
            <Button
              title="Modifier cette recette"
              icon="edit"
              variant="primary"
              onPress={() => router.push(`/modifier-recette/${recipeId}`)}
              style={styles.editButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.small,
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
  
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.md,
  },
  
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  content: {
    flex: 1,
  },
  
  recipeImage: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.background,
  },
  
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  recipeContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  
  section: {
    marginTop: theme.spacing.lg,
  },
  
  recipeTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  
  recipeDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  
  tagChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
  },
  
  tagText: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  
  ingredientItem: {
    paddingVertical: theme.spacing.xs,
  },
  
  ingredientText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  
  stepItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  
  stepNumberText: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  
  stepText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  
  actionSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  
  editButton: {
    width: '100%',
  },
});
