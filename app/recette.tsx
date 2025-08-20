import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Input, RecipeItem } from "../src/components";
import { FavoriteManager, RecipeIngredientManager, RecipeManager, RecipeTagManager, ShoppingListManager, TagManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Recipe, Tag } from "../src/types";

export default function RecipePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [foodAnimations, setFoodAnimations] = useState<{[key: number]: boolean}>({});

  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  
  // Animation pour le champ de recherche
  const searchAnimation = useRef(new Animated.Value(0)).current;
  
  // Référence pour le champ de recherche
  const searchInputRef = useRef<TextInput>(null);

  // Animations pour les favoris - seulement des refs
  const favoriteAnimationRefs = useRef<{[key: number]: Animated.Value}>({});
  
  // Animations pour les icônes de nourriture
  const foodAnimationRefs = useRef<{[key: number]: Animated.Value[]}>({});

  useEffect(() => {
    loadRecipes();
    loadTags();
    loadFavorites();
  }, []);

  // Recharger les recettes à chaque fois qu'on revient sur la page
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    filterRecipes();
  }, [recipes, selectedTags, searchQuery]);

  const filterRecipes = async () => {
    let filtered = recipes;

    // Filtre par recherche textuelle
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filtre par tags si des tags sont sélectionnés
    if (selectedTags.size === 0) {
      setFilteredRecipes(filtered);
      return;
    }
    
    const tagFiltered = [];
    for (const recipe of filtered) {
      try {
        const recipeTags = await RecipeTagManager.getTagsForRecipe(recipe.id);
        // Vérifier si la recette a au moins un des tags sélectionnés
        if (recipeTags.some(rt => selectedTags.has(rt.tagId))) {
          tagFiltered.push(recipe);
        }
      } catch (error) {
        console.error('Erreur lors du filtrage:', error);
      }
    }
    setFilteredRecipes(tagFiltered);
  };

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

  const getFilteredRecipes = () => {
    return filteredRecipes;
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

  const toggleSearch = () => {
    const toValue = showSearchInput ? 0 : 1;
    
    setShowSearchInput(!showSearchInput);
    
    Animated.timing(searchAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (toValue === 0) {
        // Si on ferme la recherche, vider le texte de recherche
        setSearchQuery('');
      } else {
        // Si on ouvre la recherche, focus sur le champ
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    });
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const renderTag = ({ item: tag }: { item: Tag }) => {
    // Le tag "Tous" a l'ID 0, c'est un cas spécial
    const isAllTag = tag.id === 0;
    const isSelected = isAllTag ? selectedTags.size === 0 : selectedTags.has(tag.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.tagChip,
          isSelected && styles.tagChipSelected
        ]}
        onPress={() => {
          if (isAllTag) {
            // Si on clique sur "Tous", on vide la sélection
            setSelectedTags(new Set());
          } else {
            toggleTag(tag.id);
          }
        }}
      >
        <Text style={[
          styles.tagText,
          isSelected && styles.tagTextSelected
        ]}>
          {tag.name}
        </Text>
      </TouchableOpacity>
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
            <Text style={styles.title}>Mes Recettes</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => router.push("/favoris")}
            >
              <FontAwesome 
                name="heart" 
                size={20} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <FontAwesome name="search" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Input avec Animation */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            height: searchAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 80],
            }),
            opacity: searchAnimation,
          }
        ]}
      >
        <Input
          ref={searchInputRef}
          placeholder="Rechercher une recette..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
          style={styles.searchInput}
          containerStyle={styles.searchInputContainer}
        />
      </Animated.View>

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
  
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  
  favoriteButton: {
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
  
  searchContainer: {
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.sm,
  },
  
  searchInputContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  
  searchInput: {
    fontSize: 16,
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
