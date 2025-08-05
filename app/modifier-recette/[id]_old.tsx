import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome } from '@expo/vector-icons';
import { IngredientManager, RecipeIngredientManager, RecipeManager, RecipeTagManager, TagManager } from "../../src/services/storage";
import { Ingredient, Recipe, RecipeIngredient, RecipeTag, Tag } from "../../src/types";

export default function EditRecipePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
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

  const availableUnits = ["g", "cl", "u"];

  useEffect(() => {
    loadRecipe();
    loadTags();
  }, [id]);

  const loadTags = async () => {
    try {
      const tags = await TagManager.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    }
  };

  const loadRecipe = async () => {
    try {
      // Charger la recette
      const recipeData = await RecipeManager.getRecipeById(Number(id));
      if (recipeData) {
        setRecipe(recipeData);

        // Charger les ingrédients
        const recipeIngredients = await RecipeIngredientManager.getIngredientsForRecipe(Number(id));
        const allIngredients = await IngredientManager.getIngredients();
        const loadedIngredients = recipeIngredients.map((ri) => {
          const ingredient = allIngredients.find(i => i.id === ri.ingredientId);
          return {
            name: ingredient?.name || "",
            quantity: ri.quantity,
            unit: ri.unit
          };
        });
        setIngredients(loadedIngredients);

        // Charger les tags
        const recipeTags = await RecipeTagManager.getTagsForRecipe(Number(id));
        const loadedTagIds = recipeTags.map(rt => rt.tagId);
        setSelectedTags(loadedTagIds);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la recette:', error);
    }
  };

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

  const handleDelete = () => {
    Alert.alert(
      "Supprimer la recette",
      "Êtes-vous sûr de vouloir supprimer cette recette ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              // Supprimer les liaisons
              const allRecipeIngredients = await RecipeIngredientManager.getRecipeIngredients();
              const filteredRecipeIngredients = allRecipeIngredients.filter(ri => ri.recipeId !== Number(id));
              await AsyncStorage.setItem('recipe_ingredients', JSON.stringify(filteredRecipeIngredients));

              const allRecipeTags = await RecipeTagManager.getRecipeTags();
              const filteredRecipeTags = allRecipeTags.filter(rt => rt.recipeId !== Number(id));
              await AsyncStorage.setItem('recipe_tags', JSON.stringify(filteredRecipeTags));

              // Supprimer la recette
              await RecipeManager.deleteRecipe(Number(id));

              router.push("/recette");
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression de la recette');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!recipe.name?.trim()) {
      Alert.alert('Erreur', 'Le nom de la recette est obligatoire');
      return;
    }

    try {
      // Mettre à jour la recette
      const updatedRecipe: Recipe = {
        id: Number(id),
        name: recipe.name,
        description: recipe.description || "",
        imageUri: recipe.imageUri || "",
        createdAt: recipe.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await RecipeManager.saveRecipe(updatedRecipe);

      // Supprimer les anciennes liaisons
      const allRecipeIngredients = await RecipeIngredientManager.getRecipeIngredients();
      const filteredRecipeIngredients = allRecipeIngredients.filter(ri => ri.recipeId !== Number(id));
      await AsyncStorage.setItem('recipe_ingredients', JSON.stringify(filteredRecipeIngredients));

      const allRecipeTags = await RecipeTagManager.getRecipeTags();
      const filteredRecipeTags = allRecipeTags.filter(rt => rt.recipeId !== Number(id));
      await AsyncStorage.setItem('recipe_tags', JSON.stringify(filteredRecipeTags));

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
          recipeId: updatedRecipe.id,
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
          recipeId: updatedRecipe.id,
          tagId: tagId,
        };
        await RecipeTagManager.saveRecipeTag(recipeTag);
      }

      router.back();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde de la recette');
    }
  };

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
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
              style={[styles.input, { flex: 1, marginHorizontal: 8 }]}
              value={newIngredient.quantity.toString()}
              onChangeText={text => {
                const quantity = parseInt(text) || 1;
                setNewIngredient({ ...newIngredient, quantity });
              }}
              keyboardType="numeric"
              placeholder="Qté"
              placeholderTextColor="#9ca3af"
            />
            <Modal
              animationType="slide"
              transparent={true}
              visible={open}
              onRequestClose={() => setOpen(false)}
            >
              <Pressable 
                style={styles.modalOverlay} 
                onPress={() => setOpen(false)}
              >
                <View style={styles.modalContent}>
                  {availableUnits.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={styles.unitOption}
                      onPress={() => {
                        setNewIngredient({ ...newIngredient, unit });
                        setOpen(false);
                      }}
                    >
                      <Text style={styles.unitOptionText}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            </Modal>
            <TouchableOpacity
              style={[styles.input, { flex: 1 }]}
              onPress={() => setOpen(true)}
            >
              <Text style={{ color: '#4b5563' }}>{newIngredient.unit}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { marginLeft: 8 }]}
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.submitButton, styles.deleteButton]} onPress={handleDelete}>
            <View style={styles.buttonContent}>
              <FontAwesome name="trash" size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>Supprimer</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
            <View style={styles.buttonContent}>
              <FontAwesome name="save" size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  inputRequired: {
    borderColor: '#ef4444',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ingredientsList: {
    marginBottom: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
  },
  addIngredientForm: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  unitOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unitOptionText: {
    fontSize: 16,
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#1f2937',
  },
  addTagForm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    fontSize: 14,
    color: '#ffffff',
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
