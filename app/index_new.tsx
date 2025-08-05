import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Input } from "../src/components/Input";
import { ShoppingListManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { ShoppingListItem } from "../src/types";

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
  return formatQuantity(item.quantity, item.unit);
};

export default function ShoppingListPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const list = await ShoppingListManager.getShoppingList();
      setShoppingList(list);
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
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const incrementQuantity = async (id: number) => {
    try {
      const updatedList = shoppingList.map(item => 
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const decrementQuantity = async (id: number) => {
    try {
      const updatedList = shoppingList.map(item => 
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
      );
      setShoppingList(updatedList);
      await ShoppingListManager.updateShoppingList(updatedList);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const deleteItem = async (id: number) => {
    Alert.alert(
      "Supprimer l'article",
      "Êtes-vous sûr de vouloir supprimer cet article ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedList = shoppingList.filter(item => item.id !== id);
              setShoppingList(updatedList);
              await ShoppingListManager.updateShoppingList(updatedList);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleItem(item.id)}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && (
              <FontAwesome name="check" size={14} color={theme.colors.surface} />
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {item.name}
          </Text>
          <Text style={styles.itemQuantity}>
            {formatQuantityWithUnit(item)}
          </Text>
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => decrementQuantity(item.id)}
          >
            <FontAwesome name="minus" size={12} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => incrementQuantity(item.id)}
          >
            <FontAwesome name="plus" size={12} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item.id)}
        >
          <FontAwesome name="trash" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
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
        <View style={styles.addInputContainer}>
          <Input
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Ajouter un article..."
            variant="filled"
            style={styles.addInput}
            onSubmitEditing={addItem}
          />
          <Button
            title=""
            icon="plus"
            onPress={addItem}
            size="medium"
            style={styles.addButton}
          />
        </View>
      </Card>

      {/* Shopping List */}
      <FlatList
        data={shoppingList.sort((a, b) => a.checked ? 1 : -1)}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  
  addInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  
  addInput: {
    flex: 1,
    marginBottom: 0,
  },
  
  addButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
  },
  
  list: {
    flex: 1,
  },
  
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  
  itemCard: {
    marginBottom: theme.spacing.md,
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
  
  itemQuantity: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  
  quantityText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  
  deleteButton: {
    padding: theme.spacing.sm,
  },
});
