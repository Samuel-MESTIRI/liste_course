import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { FavoriteManager, RecipeManager, RecipeTagManager, ShoppingListManager, TagManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Recipe, Tag } from "../src/types";

export default function RecipePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRecipes();
    loadTags();
    loadFavorites();
  }, []);

  const loadRecipes = async () => {
    try {
      const recipeList = await RecipeManager.getRecipes();
      setRecipes(recipeList);
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    }
  };

  const loadTags = async () => {
    try {
      const tagList = await TagManager.getTags();
      setTags(tagList);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const favoriteList = await FavoriteManager.getFavorites();
      setFavorites(new Set(favoriteList.map(f => f.recipeId)));
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const addToShoppingList = async (recipeId: number) => {
    try {
      await ShoppingListManager.addRecipeToShoppingList(recipeId);
      // Optionnel: afficher un message de succès
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la liste:', error);
    }
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
      } else {
        await FavoriteManager.addFavorite(recipeId);
        setFavorites(prev => new Set([...prev, recipeId]));
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  const getFilteredRecipes = () => {
    if (!selectedTag) return recipes;
    
    return recipes.filter(async (recipe) => {
      try {
        const recipeTags = await RecipeTagManager.getTagsForRecipe(recipe.id);
        return recipeTags.some(rt => rt.tagId === selectedTag);
      } catch (error) {
        return false;
      }
    });
  };

  const renderRecipe = ({ item: recipe }: { item: Recipe }) => (
    <Card style={styles.recipeCard}>
      <TouchableOpacity
        style={styles.recipeContent}
        onPress={() => router.push(`/modifier-recette/${recipe.id}`)}
      >
        {recipe.imageUri ? (
          <Image
            source={{ uri: recipe.imageUri }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.recipePlaceholder}>
            <FontAwesome name="image" size={32} color={theme.colors.textLight} />
          </View>
        )}
        
        <View style={styles.recipeInfo}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {recipe.name}
            </Text>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(recipe.id)}
            >
              <FontAwesome
                name={favorites.has(recipe.id) ? "heart" : "heart-o"}
                size={20}
                color={favorites.has(recipe.id) ? theme.colors.error : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          
          {recipe.description && (
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>
          )}
          
          <View style={styles.recipeActions}>
            <View style={styles.recipeTime}>
              <FontAwesome name="clock-o" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.timeText}>30 min</Text>
            </View>
            
            <Button
              title="Ajouter"
              icon="shopping-cart"
              variant="primary"
              size="small"
              onPress={() => addToShoppingList(recipe.id)}
              style={styles.addToListButton}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderTag = ({ item: tag }: { item: Tag }) => (
    <TouchableOpacity
      style={[
        styles.tagChip,
        selectedTag === tag.id && styles.tagChipSelected
      ]}
      onPress={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
    >
      <Text style={[
        styles.tagText,
        selectedTag === tag.id && styles.tagTextSelected
      ]}>
        {tag.name}
      </Text>
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Mes Recettes</Text>
          </View>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {/* TODO: Implement search */}}
          >
            <FontAwesome name="search" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <View style={styles.filterSection}>
          <FlatList
            data={[{ id: 0, name: 'Tous' }, ...tags]}
            renderItem={renderTag}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}
          />
        </View>
      )}

      {/* Recipes Grid */}
      <FlatList
        data={getFilteredRecipes()}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        style={styles.recipesList}
        contentContainerStyle={styles.recipesContent}
        columnWrapperStyle={styles.recipeRow}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/ajouter-recette")}
      >
        <FontAwesome name="plus" size={24} color={theme.colors.surface} />
      </TouchableOpacity>
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
  
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  filterSection: {
    paddingVertical: theme.spacing.md,
  },
  
  tagsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  
  tagChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  tagChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  
  tagText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
  },
  
  tagTextSelected: {
    color: theme.colors.surface,
  },
  
  recipesList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  
  recipesContent: {
    paddingBottom: 100,
  },
  
  recipeRow: {
    gap: theme.spacing.md,
  },
  
  recipeCard: {
    flex: 1,
    marginBottom: theme.spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  
  recipeContent: {
    flex: 1,
  },
  
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.background,
  },
  
  recipePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  recipeInfo: {
    padding: theme.spacing.md,
  },
  
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  
  recipeTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  
  favoriteButton: {
    padding: theme.spacing.xs,
  },
  
  recipeDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  
  recipeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  recipeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  
  timeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  
  addToListButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
});
