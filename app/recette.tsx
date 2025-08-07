import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, FlatList, Image, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Input } from "../src/components/Input";
import { FavoriteManager, RecipeManager, RecipeTagManager, ShoppingListManager, TagManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Recipe, Tag } from "../src/types";

export default function RecipePage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [foodAnimations, setFoodAnimations] = useState<{[key: number]: boolean}>({});
  const [favoriteAnimations, setFavoriteAnimations] = useState<{[key: number]: boolean}>({});

  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  
  // Animation pour le champ de recherche
  const searchAnimation = useRef(new Animated.Value(0)).current;
  
  // Référence pour le champ de recherche
  const searchInputRef = useRef<TextInput>(null);

  // Animations pour les icônes de nourriture
  const foodAnimationRefs = useRef<{[key: number]: Animated.Value[]}>({});
  
  // Animations pour les favoris
  const favoriteAnimationRefs = useRef<{[key: number]: Animated.Value}>({});

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
  }, [recipes, selectedTags, showFavoritesOnly, searchQuery]);

  const filterRecipes = async () => {
    let filtered = recipes;

    // Filtre par favoris si activé
    if (showFavoritesOnly) {
      filtered = filtered.filter(recipe => favorites.has(recipe.id));
    }

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
      console.log('Tentative d\'ajout de la recette à la liste:', recipeId);
      await ShoppingListManager.addRecipeToShoppingList(recipeId);
      console.log('Recette ajoutée à la liste de courses avec succès');
      
      // Déclencher l'animation des icônes de nourriture
      triggerFoodAnimation(recipeId);
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la liste:', error);
    }
  };

  const triggerFavoriteAnimation = (recipeId: number) => {
    // Créer l'animation pour ce favori si elle n'existe pas
    if (!favoriteAnimationRefs.current[recipeId]) {
      favoriteAnimationRefs.current[recipeId] = new Animated.Value(1);
    }

    // Afficher l'animation pour cette recette
    setFavoriteAnimations(prev => ({ ...prev, [recipeId]: true }));

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
    ]).start(() => {
      // Cacher l'animation après
      setFavoriteAnimations(prev => ({ ...prev, [recipeId]: false }));
    });
  };

  const toggleFavorite = async (recipeId: number) => {
    try {
      // Déclencher l'animation avant de changer l'état
      triggerFavoriteAnimation(recipeId);
      
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
    return filteredRecipes;
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
    Animated.stagger(120, animations.map((anim, index) => 
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
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

  const renderRecipe = ({ item: recipe }: { item: Recipe }) => {
    const foodEmojis = ['🥕', '🥩', '🍎']; // Carotte, Viande, Pomme
    const showAnimation = foodAnimations[recipe.id];
    const animations = foodAnimationRefs.current[recipe.id] || [];
    const showFavoriteAnimation = favoriteAnimations[recipe.id];
    const favoriteAnimation = favoriteAnimationRefs.current[recipe.id];

    return (
      <View style={styles.recipeCardContainer}>
        <Card style={styles.recipeCard}>
          <TouchableOpacity
            style={styles.recipeContent}
            onPress={() => router.push(`/fiche-recette/${recipe.id}`)}
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
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: showFavoriteAnimation && favoriteAnimation 
                          ? favoriteAnimation 
                          : 1
                      }
                    ]
                  }}
                >
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
                </Animated.View>
              </View>
              
              {recipe.description && (
                <Text style={styles.recipeDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>
              )}
              
              <View style={styles.recipeActions}>            
                <Button
                  title="Ajouter"
                  icon="cart-plus"
                  variant="primary"
                  size="small"
                  onPress={() => addToShoppingList(recipe.id)}
                  style={styles.addToListButton}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Animation des icônes de nourriture */}
        {showAnimation && animations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.foodIcon,
              {
                transform: [
                  {
                    translateX: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -300],
                    }),
                  },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, -50, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 0.2, 0.8, 1],
                      outputRange: [0.5, 1.2, 1, 0.8],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
              },
            ]}
          >
            <Text style={styles.foodEmoji}>
              {foodEmojis[index]}
            </Text>
          </Animated.View>
        ))}
      </View>
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
        // Quand on sélectionne un tag, on désactive le filtre favoris
        setShowFavoritesOnly(false);
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
            // Si on clique sur "Tous", on vide la sélection et on désactive le filtre favoris
            setSelectedTags(new Set());
            setShowFavoritesOnly(false);
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
              style={[
                styles.favoriteFilterButton,
                showFavoritesOnly && styles.favoriteFilterButtonActive
              ]}
              onPress={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                // Quand on active le filtre favoris, on désélectionne tous les tags
                if (!showFavoritesOnly) {
                  setSelectedTags(new Set());
                }
              }}
            >
              <FontAwesome 
                name={showFavoritesOnly ? "heart" : "heart-o"} 
                size={20} 
                color={showFavoritesOnly ? theme.colors.surface : theme.colors.primary} 
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
  
  favoriteFilterButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  favoriteFilterButtonActive: {
    backgroundColor: theme.colors.primary,
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
  
  recipeCardContainer: {
    flex: 1,
    position: 'relative',
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
  
  foodIcon: {
    position: 'absolute',
    top: '50%',
    right: '20%',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: theme.spacing.sm,
    ...theme.shadows.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  foodEmoji: {
    fontSize: 24,
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
