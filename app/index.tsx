import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { RecipeManager, ShoppingListManager } from "../src/services/storage";
import { Recipe, ShoppingListItem } from "../src/types";

// Fonctions utilitaires pour les quantités et unités
const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'g' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(quantity % 1000 === 0 ? 0 : 1)} kg`;
  }
  if (unit === 'cl' && quantity >= 100) {
    return `${(quantity / 100).toFixed(quantity % 100 === 0 ? 0 : 1)} L`;
  }
  return `${quantity} ${unit}`;
};

const formatQuantityWithUnit = (item: ShoppingListItem): string => {
  if (!item.unit) return item.quantity.toString();
  return formatQuantity(item.quantity, item.unit);
};

const getSmartIncrement = (unit: string): number => {
  switch (unit) {
    case 'g': return 100;
    case 'cl': return 10;
    default: return 1;
  }
};

export default function Index() {
  const router = useRouter();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [swipeAnimations, setSwipeAnimations] = useState<{ [key: number]: Animated.Value }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [linkedRecipes, setLinkedRecipes] = useState<Recipe[]>([]);

  // Charger les données au démarrage
  useEffect(() => {
    loadItems();
  }, []);

  // Sauvegarder les données quand items change
  useEffect(() => {
    if (!isLoading) {
      saveItems();
    }
  }, [items, isLoading]);

  const loadItems = async () => {
    try {
      const savedItems = await ShoppingListManager.getShoppingList();
      if (savedItems.length > 0) {
        setItems(savedItems);
        
        // Initialiser les animations pour les éléments chargés
        const animations: { [key: number]: Animated.Value } = {};
        savedItems.forEach((item: ShoppingListItem) => {
          animations[item.id] = new Animated.Value(0);
        });
        setSwipeAnimations(animations);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveItems = async () => {
    try {
      await ShoppingListManager.saveShoppingList(items);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  };

  const toggleItem = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const incrementQuantity = (id: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const increment = getSmartIncrement(item.unit || 'u');
        return { ...item, quantity: item.quantity + increment };
      }
      return item;
    }));
  };

  const decrementQuantity = (id: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const increment = getSmartIncrement(item.unit || 'u');
        return { ...item, quantity: Math.max(increment, item.quantity - increment) };
      }
      return item;
    }));
  };

  const addItem = () => {
    if (newItem.trim()) {
      const newId = Date.now();
      setSwipeAnimations(prev => ({
        ...prev,
        [newId]: new Animated.Value(0)
      }));
      
      setItems([...items, {
        id: newId,
        name: newItem.trim(),
        quantity: 1,
        unit: "u",
        checked: false,
        recipeIds: []
      }]);
      setNewItem("");
    }
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    setSwipeAnimations(prev => {
      const newAnimations = { ...prev };
      delete newAnimations[id];
      return newAnimations;
    });
  };

  const clearList = () => {
    setItems([]);
    setSwipeAnimations({});
  };

  const clearCheckedItems = () => {
    setItems(items.filter(item => !item.checked));
  };

  const onSwipeGestureEvent = (id: number) => (event: any) => {
    const { translationX } = event.nativeEvent;
    
    if (!swipeAnimations[id]) {
      setSwipeAnimations(prev => ({
        ...prev,
        [id]: new Animated.Value(0)
      }));
    }

    if (translationX < 0) {
      swipeAnimations[id]?.setValue(translationX);
    }
  };

  const onSwipeHandlerStateChange = (id: number) => (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.END) {
      if (translationX < -100) {
        // Swipe suffisamment long pour supprimer
        Animated.timing(swipeAnimations[id], {
          toValue: -200,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          removeItem(id);
        });
      } else {
        // Retour à la position initiale
        Animated.spring(swipeAnimations[id], {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Trier les éléments : non cochés en premier, puis cochés
  const sortedItems = [...items].sort((a, b) => {
    if (a.checked === b.checked) {
      return 0; // Garder l'ordre original si même statut
    }
    return a.checked ? 1 : -1; // Non cochés en premier
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Liste de Courses</Text>
          <Text style={styles.subtitle}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Liste de Courses</Text>
        <Text style={styles.subtitle}>Gérez vos courses facilement</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={clearList}>
            <Text style={styles.actionButtonText}>🗑️ Vider la liste</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={clearCheckedItems}>
            <Text style={styles.actionButtonText}>✅ Supprimer barrés</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="Ajouter un article..."
            placeholderTextColor="#9ca3af"
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
          />
          <TouchableOpacity style={styles.addButton} onPress={addItem}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.listContainer}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={false}
          contentContainerStyle={styles.scrollContent}
        >
          {sortedItems.map((item) => (
            <View key={item.id} style={styles.itemWrapper}>
              <View style={styles.deleteBackground}>
                <Text style={styles.deleteText}>🗑️ Supprimer</Text>
              </View>
              
              <PanGestureHandler
                onGestureEvent={onSwipeGestureEvent(item.id)}
                onHandlerStateChange={onSwipeHandlerStateChange(item.id)}
                activeOffsetX={[-10, 10]}
                failOffsetY={[-20, 20]}
              >
                <Animated.View 
                  style={[
                    styles.itemCard,
                    item.checked && styles.itemCardChecked,
                    {
                      transform: [{
                        translateX: swipeAnimations[item.id] || 0
                      }]
                    }
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.itemTouchable}
                    onPress={() => toggleItem(item.id)}
                    onLongPress={async () => {
                      setSelectedItem(item);
                      if (item.recipeIds && item.recipeIds.length > 0) {
                        const recipes = await Promise.all(
                          item.recipeIds.map(id => RecipeManager.getRecipeById(id))
                        );
                        setLinkedRecipes(recipes.filter((recipe): recipe is Recipe => recipe !== undefined));
                      } else {
                        setLinkedRecipes([]);
                      }
                      setModalVisible(true);
                    }}
                  >
                    <View style={styles.itemContent}>
                      <View style={[styles.checkbox, item.checked && styles.checked]}>
                        {item.checked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, item.checked && styles.itemChecked]}>
                          {item.name}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => decrementQuantity(item.id)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{formatQuantityWithUnit(item)}</Text>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => incrementQuantity(item.id)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </PanGestureHandler>
            </View>
          ))}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{selectedItem?.name}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Recettes associées</Text>
                {linkedRecipes.length > 0 ? (
                  <ScrollView style={styles.recipesList}>
                    {linkedRecipes.map((recipe) => (
                      <TouchableOpacity 
                        key={recipe.id}
                        style={styles.recipeItem}
                        onPress={() => {
                          setModalVisible(false);
                          router.push({
                            pathname: "/recette",
                            params: { id: recipe.id }
                          });
                        }}
                      >
                        <Text style={styles.recipeTitle}>🥘 {recipe.name}</Text>
                        <Text style={styles.recipeDescription} numberOfLines={2}>
                          {recipe.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noRecipeContainer}>
                    <Text style={styles.noRecipeText}>Aucune recette associée à cet ingrédient</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCloseButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalCloseButtonText]}>Fermer</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => router.push("/recette")}
          >
            <Text style={styles.navButtonText}>📖 Recettes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalSection: {
    width: '100%',
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 10,
  },
  recipesList: {
    maxHeight: 200,
  },
  recipeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  recipeIngredient: {
    fontSize: 14,
    color: '#6c757d',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  noRecipeContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    width: '100%',
  },
  noRecipeText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  modalButtons: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  itemWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemCardChecked: {
    backgroundColor: '#e9ecef',
  },
  itemTouchable: {
    flex: 1,
    padding: 8,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  navigationButtons: {
    marginTop: 20,
  },
  navButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
}); 