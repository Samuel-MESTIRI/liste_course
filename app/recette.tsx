// Fichier temporaire pour les recettes
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FavoriteManager, RecipeManager, RecipeTagManager, ShoppingListManager, TagManager } from "../src/services/storage";
import { Recipe, Tag } from "../src/types";

export default function RecipePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, selectedTags, showFavoritesOnly, favorites]);

  const filterRecipes = async () => {
    let filtered = [...recipes];

    // Filtrer par favoris si demandé
    if (showFavoritesOnly) {
      filtered = filtered.filter(recipe => favorites.includes(recipe.id));
    }

    // Filtrer par tags si des tags sont sélectionnés
    if (selectedTags.length > 0) {
      const tagFilteredRecipes = [];
      for (const recipe of filtered) {
        const recipeTags = await RecipeTagManager.getTagsForRecipe(recipe.id);
        if (recipeTags.some(rt => selectedTags.includes(rt.tagId))) {
          tagFilteredRecipes.push(recipe);
        }
      }
      filtered = tagFilteredRecipes;
    }

    setFilteredRecipes(filtered);
  };

  const loadData = async () => {
    try {
      // Initialiser les tags prédéfinis
      await TagManager.initializeTags();
      
      const [loadedRecipes, loadedTags, loadedFavorites] = await Promise.all([
        RecipeManager.getRecipes(),
        TagManager.getTags(),
        FavoriteManager.getFavorites(),
      ]);
      setRecipes(loadedRecipes);
      setTags(loadedTags);
      setFavorites(loadedFavorites.map(f => f.recipeId));
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const addToShoppingList = async (recipeId: number) => {
    try {
      await ShoppingListManager.addRecipeToShoppingList(recipeId);
      router.push("/");
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la liste de courses:', error);
    }
  };

  const toggleFavorite = async (recipeId: number) => {
    try {
      const isFavorite = favorites.includes(recipeId);
      if (isFavorite) {
        await FavoriteManager.removeFavorite(recipeId);
        setFavorites(prev => prev.filter(id => id !== recipeId));
      } else {
        await FavoriteManager.addFavorite(recipeId);
        setFavorites(prev => [...prev, recipeId]);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Mes Recettes</Text>
      </View>

      {/* Section Filtres */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filtres</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {/* Bouton Favoris */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFavoritesOnly && styles.filterButtonSelected
            ]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Text 
              style={[
                styles.filterText,
                showFavoritesOnly && styles.filterTextSelected
              ]}
            >
              ❤️ Favoris
            </Text>
          </TouchableOpacity>

          {/* Boutons Tags */}
          {tags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.filterButton,
                selectedTags.includes(tag.id) && styles.filterButtonSelected
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text 
                style={[
                  styles.filterText,
                  selectedTags.includes(tag.id) && styles.filterTextSelected
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRecipes}
        numColumns={2}
        columnWrapperStyle={styles.recipeRow}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        renderItem={({item: recipe}) => (
          <TouchableOpacity 
            style={styles.recipeCard}
            onPress={() => router.push(`/modifier-recette/${recipe.id}`)}
          >
            <Image
              source={{ uri: recipe.imageUri }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName} numberOfLines={1}>
                {recipe.name}
              </Text>
              <Text style={styles.recipeDescription} numberOfLines={2}>
                {recipe.description}
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe.id);
                  }}
                >
                  <Text style={styles.favoriteButtonText}>
                    {favorites.includes(recipe.id) ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    addToShoppingList(recipe.id);
                  }}
                >
                  <Text style={styles.addButtonText}>Ajouter 🛒</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push("/ajouter-recette")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const windowWidth = Dimensions.get('window').width;
const cardWidth = (windowWidth - 48) / 2; // 48 = padding horizontal total (16 * 2 + gap 16)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  recipeRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tagContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tagButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagButtonSelected: {
    backgroundColor: '#4b5563',
  },
  tagText: {
    color: '#1f2937',
    fontSize: 14,
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  filterSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  content: {
    paddingVertical: 16,
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: cardWidth,
  },
  recipeImage: {
    width: '100%',
    height: cardWidth, // Image carrée
  },
  recipeInfo: {
    padding: 16,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  favoriteButtonText: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
