import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome } from '@expo/vector-icons';
import { IngredientManager, RecipeIngredientManager, RecipeManager, RecipeTagManager, TagManager } from "../src/services/storage";
import { Ingredient, Recipe, RecipeIngredient, RecipeTag, Tag } from "../src/types";

export default function AddRecipePage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: "",
    description: "",
    imageUri: "",
  });
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);
  const [newIngredient, setNewIngredient] = useState({ name: "", quantity: 1, unit: "u" });
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await TagManager.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    }
  };

  const availableUnits = ["g", "cl", "u"];
  const formatQuantity = (quantity: number, unit: string): string => {
    switch (unit) {
      case "g":
        return quantity >= 1000 ? `${(quantity / 1000).toFixed(1)}kg` : `${quantity}g`;
      case "cl":
        return quantity >= 100 ? `${(quantity / 100).toFixed(1)}L` : `${quantity}cl`;
      case "u":
        return quantity === 1 ? "1 u" : `${quantity} u`;
      default:
        return `${quantity} ${unit}`;
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.name.trim()) {
      setIngredients([...ingredients, { ...newIngredient }]);
      setNewIngredient({ name: "", quantity: 1, unit: "u" });
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (!recipe.name?.trim()) {
      alert('Le nom de la recette est obligatoire');
      return;
    }

    try {
      // Créer la recette
      const newRecipe: Recipe = {
        id: Date.now(),
        name: recipe.name,
        description: recipe.description || "",
        imageUri: recipe.imageUri || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await RecipeManager.saveRecipe(newRecipe);

      // Sauvegarder les ingrédients
      for (const ingredient of ingredients) {
        // Vérifier si l'ingrédient existe déjà
        const allIngredients = await IngredientManager.getIngredients();
        let ingredientId: number;
        const existingIngredient = allIngredients.find(i => i.name.toLowerCase() === ingredient.name.toLowerCase());
        
        if (existingIngredient) {
          ingredientId = existingIngredient.id;
        } else {
          const newIngredient: Ingredient = {
            id: Date.now() + Math.random(),
            name: ingredient.name,
          };
          await IngredientManager.saveIngredient(newIngredient);
          ingredientId = newIngredient.id;
        }

        // Créer la liaison recette-ingrédient
        const recipeIngredient: RecipeIngredient = {
          recipeId: newRecipe.id,
          ingredientId: ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        };
        await RecipeIngredientManager.saveRecipeIngredient(recipeIngredient);
      }

      // Sauvegarder les tags
      for (const tagId of selectedTags) {
        // Créer la liaison recette-tag
        const recipeTag: RecipeTag = {
          recipeId: newRecipe.id,
          tagId: tagId,
        };
        await RecipeTagManager.saveRecipeTag(recipeTag);
      }

      router.push("/recette");
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <View style={styles.header}>
        <Text style={styles.title}>➕ Nouvelle Recette</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de la recette <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, !recipe.name && styles.inputRequired]}
            value={recipe.name}
            onChangeText={name => setRecipe({ ...recipe, name })}
            placeholder="Ex: Pasta Carbonara"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={recipe.description}
            onChangeText={description => setRecipe({ ...recipe, description })}
            placeholder="Description de la recette..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL de l'image</Text>
          <TextInput
            style={styles.input}
            value={recipe.imageUri}
            onChangeText={imageUri => setRecipe({ ...recipe, imageUri })}
            placeholder="https://..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ingrédients</Text>
          <View style={styles.ingredientsList}>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <Text style={styles.ingredientText}>
                  {ingredient.name} - {formatQuantity(ingredient.quantity, ingredient.unit)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveIngredient(index)}
                  style={styles.removeButton}
                >
                  <FontAwesome name="times" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.addIngredientForm}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              value={newIngredient.name}
              onChangeText={name => setNewIngredient({ ...newIngredient, name })}
              placeholder="Nom de l'ingrédient"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newIngredient.quantity.toString()}
              onChangeText={quantity => setNewIngredient({ ...newIngredient, quantity: parseFloat(quantity) || 0 })}
              keyboardType="numeric"
              placeholder="Qté"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={[styles.input, styles.unitSelector, { flex: 1 }]}
              onPress={() => setOpen(true)}
            >
              <Text style={styles.unitSelectorText}>{newIngredient.unit}</Text>
            </TouchableOpacity>
            <Modal
              visible={open}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setOpen(false)}
            >
              <Pressable 
                style={styles.modalOverlay}
                onPress={() => setOpen(false)}
              >
                <View style={styles.modalContent}>
                  {availableUnits.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitOption,
                        newIngredient.unit === unit && styles.unitOptionSelected
                      ]}
                      onPress={() => {
                        setNewIngredient({ ...newIngredient, unit });
                        setOpen(false);
                      }}
                    >
                      <Text style={[
                        styles.unitOptionText,
                        newIngredient.unit === unit && styles.unitOptionTextSelected
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            </Modal>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddIngredient}
            >
              <FontAwesome name="plus" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          
          {/* Tags disponibles */}
          <View style={styles.availableTagsContainer}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.availableTag,
                  selectedTags.includes(tag.id) && styles.availableTagSelected
                ]}
                onPress={() => toggleTag(tag.id)}
              >
                <Text style={[
                  styles.availableTagText,
                  selectedTags.includes(tag.id) && styles.availableTagTextSelected
                ]}>
                  {tag.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <View style={styles.saveButtonContent}>
            <FontAwesome name="save" size={16} color="#ffffff" />
            <Text style={styles.saveButtonText}>Enregistrer la recette</Text>
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  required: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  inputRequired: {
    borderColor: '#ef4444',
  },
  ingredientsList: {
    maxHeight: 200,
  },
  unitSelector: {
    justifyContent: 'center',
    paddingVertical: 12,
  },
  unitSelectorText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  unitOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
  },
  unitOptionSelected: {
    backgroundColor: '#10b981',
  },
  unitOptionText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  unitOptionTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
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
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },

  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addIngredientForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    color: '#1f2937',
    fontSize: 14,
    marginRight: 4,
  },
  removeTagButton: {
    padding: 2,
  },
  removeTagButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addTagForm: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  selectedTagText: {
    color: '#ffffff',
    fontSize: 14,
    marginRight: 4,
  },
  subLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 12,
  },
  availableTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availableTag: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  availableTagSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  availableTagText: {
    color: '#4b5563',
    fontSize: 14,
  },
  availableTagTextSelected: {
    color: '#ffffff',
  },
});
