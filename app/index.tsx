import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, FlatList, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Card } from "../src/components/Card";
import { Input } from "../src/components/Input";
import { IngredientManager, RecipeIngredientManager, RecipeManager, ShoppingListManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Ingredient, Recipe, ShoppingListItem } from "../src/types";

// Fonctions utilitaires pour les quantités et unités
const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'g' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}kg`;
  }
  if (unit === 'cl' && quantity >= 100) {
    return `${(quantity / 100).toFixed(1)}L`;
  }
  return `${quantity}${unit}`;
};

const formatQuantityWithUnit = (item: ShoppingListItem): string => {
  return formatQuantity(item.quantity, item.unit || 'u');
};

// Composant pour gérer le swipe
const SwipeableItem = ({ 
  children, 
  onDelete 
}: { 
  children: React.ReactNode; 
  onDelete: () => void; 
}) => {
  const translateX = new Animated.Value(0);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        // Limiter le swipe uniquement vers la gauche
        if (event.nativeEvent.translationX > 0) {
          translateX.setValue(0);
        }
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // Seulement traiter les swipes vers la gauche
      if (translationX < -100) {
        // Swipe assez loin pour supprimer
        Animated.timing(translateX, {
          toValue: -300,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onDelete();
        });
      } else {
        // Revenir à la position initiale
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Fond de suppression */}
      <View style={styles.deleteBackground}>
        <FontAwesome name="trash" size={20} color={theme.colors.surface} />
        <Text style={styles.deleteText}>Supprimer</Text>
      </View>
      
      {/* Élément principal */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={-10}
        failOffsetX={10}
        failOffsetY={[-20, 20]}
      >
        <Animated.View
          style={[
            styles.swipeableContent,
            { transform: [{ translateX }] }
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default function ShoppingListPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [recipesWithItem, setRecipesWithItem] = useState<Recipe[]>([]);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const list = await ShoppingListManager.getShoppingList();
      // Trier la liste une seule fois au chargement
      const sortedList = list.sort((a, b) => a.checked ? 1 : -1);
      setShoppingList(sortedList);
    } catch (error) {
      console.error('Erreur lors du chargement de la liste:', error);
    }
  };

  const addItem = async () => {
    if (newItem.trim()) {
      const item: ShoppingListItem = {
        id: Date.now(),
        name: newItem.trim(),
        quantity: 1,
        unit: 'u',
        checked: false,
      };
      
      try {
        await ShoppingListManager.addItem(item);
        setShoppingList(prev => [...prev, item]);
        setNewItem("");
      } catch (error) {
        console.error('Erreur lors de l\'ajout:', error);
      }
    }
  };

  const toggleItem = async (id: number) => {
    try {
      const updatedList = shoppingList.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      // Trier seulement quand on coche/décoche un élément
      const sortedList = updatedList.sort((a, b) => a.checked ? 1 : -1);
      setShoppingList(sortedList);
      await ShoppingListManager.updateShoppingList(sortedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const incrementQuantity = async (id: number) => {
    try {
      const updatedList = shoppingList.map(item => {
        if (item.id === id) {
          let increment = 1; // Par défaut pour 'u'
          if (item.unit === 'g') increment = 100;
          else if (item.unit === 'cl') increment = 10;
          
          return { ...item, quantity: item.quantity + increment };
        }
        return item;
      });
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const decrementQuantity = async (id: number) => {
    try {
      const updatedList = shoppingList.map(item => {
        if (item.id === id) {
          let decrement = 1; // Par défaut pour 'u'
          if (item.unit === 'g') decrement = 100;
          else if (item.unit === 'cl') decrement = 10;
          
          return { ...item, quantity: Math.max(decrement, item.quantity - decrement) };
        }
        return item;
      });
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const updatedList = shoppingList.filter(item => item.id !== id);
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const findRecipesWithIngredient = async (itemName: string): Promise<Recipe[]> => {
    try {
      // Récupérer tous les ingrédients
      const allIngredients = await IngredientManager.getIngredients();
      
      // Trouver les ingrédients qui correspondent au nom de l'item (recherche flexible)
      const matchingIngredients = allIngredients.filter((ingredient: Ingredient) => 
        ingredient.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(ingredient.name.toLowerCase())
      );
      
      if (matchingIngredients.length === 0) {
        return [];
      }
      
      // Récupérer toutes les recettes
      const allRecipes = await RecipeManager.getRecipes();
      const recipesWithIngredient: Recipe[] = [];
      
      // Pour chaque recette, vérifier si elle contient un des ingrédients correspondants
      for (const recipe of allRecipes) {
        const recipeIngredients = await RecipeIngredientManager.getIngredientsForRecipe(recipe.id);
        const hasMatchingIngredient = recipeIngredients.some(ri => 
          matchingIngredients.some((mi: Ingredient) => mi.id === ri.ingredientId)
        );
        
        if (hasMatchingIngredient) {
          recipesWithIngredient.push(recipe);
        }
      }
      
      return recipesWithIngredient;
    } catch (error) {
      console.error('Erreur lors de la recherche des recettes:', error);
      return [];
    }
  };

  const handleLongPress = async (item: ShoppingListItem) => {
    setSelectedItem(item);
    const recipes = await findRecipesWithIngredient(item.name);
    setRecipesWithItem(recipes);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setRecipesWithItem([]);
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <SwipeableItem onDelete={() => deleteItem(item.id)}>
      <Card style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => toggleItem(item.id)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
              {item.checked && (
                <FontAwesome name="check" size={14} color={theme.colors.surface} />
              )}
            </View>
          </View>
          
          <View style={styles.itemContent}>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
              {item.name}
            </Text>
          </View>
          
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={(e) => {
                e.stopPropagation();
                decrementQuantity(item.id);
              }}
            >
              <FontAwesome name="minus" size={12} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{formatQuantity(item.quantity, item.unit || 'u')}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={(e) => {
                e.stopPropagation();
                incrementQuantity(item.id);
              }}
            >
              <FontAwesome name="plus" size={12} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    </SwipeableItem>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Ma Liste de Courses</Text>
          <TouchableOpacity
            style={styles.recipeButton}
            onPress={() => router.push("/recette")}
          >
            <FontAwesome name="book" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Item Section */}
      <Card style={styles.addSection}>
        <View style={styles.addItemContainer}>
          <Input
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Ajouter un article..."
            variant="filled"
            containerStyle={styles.addInputContainer}
            onSubmitEditing={addItem}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addItem}
            activeOpacity={0.8}
          >
            <FontAwesome name="plus" size={20} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Shopping List */}
      <FlatList
        data={shoppingList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal pour les recettes */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Recettes avec "{selectedItem?.name}"
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeModal}
              >
                <FontAwesome name="times" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {recipesWithItem.length > 0 ? (
              <FlatList
                data={recipesWithItem}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item: recipe }) => (
                  <TouchableOpacity
                    style={styles.recipeItem}
                    onPress={() => {
                      closeModal();
                      router.push(`/modifier-recette/${recipe.id}`);
                    }}
                  >
                    <Text style={styles.recipeItemName}>{recipe.name}</Text>
                    <FontAwesome name="chevron-right" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noRecipesContainer}>
                <FontAwesome name="search" size={32} color={theme.colors.textLight} />
                <Text style={styles.noRecipesText}>
                  Aucune recette trouvée avec cet ingrédient
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  
  recipeButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  addSection: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  
  addInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  
  addButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  list: {
    flex: 1,
  },
  
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  
  itemCard: {
    marginBottom: 0,
  },
  
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  
  checkboxContainer: {
    padding: theme.spacing.xs,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  
  itemContent: {
    flex: 1,
  },
  
  itemName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 32,
  },
  
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  
  quantityText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12,
  },
  
  deleteButton: {
    padding: theme.spacing.sm,
  },
  
  // Styles pour le swipe
  swipeContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  
  deleteBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.error,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  
  deleteText: {
    color: theme.colors.surface,
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  
  swipeableContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  
  // Styles pour la modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '70%',
    padding: theme.spacing.lg,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  
  modalCloseButton: {
    padding: theme.spacing.sm,
  },
  
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  
  recipeItemName: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  
  noRecipesContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  
  noRecipesText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
