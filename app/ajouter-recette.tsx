import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Header } from "../src/components/Header";
import { Input } from "../src/components/Input";
import { IngredientManager, RecipeIngredientManager, RecipeManager, RecipeTagManager, TagManager } from "../src/services/storage";
import { theme } from "../src/styles/theme";
import { Ingredient, Recipe, RecipeIngredient, RecipeTag, Tag } from "../src/types";

export default function AddRecipePage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: "",
    description: "",
    imageUri: "",
    steps: [],
  });
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);
  const [newIngredient, setNewIngredient] = useState({ name: "", quantity: 1, unit: "u" });
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [unitModalVisible, setUnitModalVisible] = useState(false);

  const availableUnits = ["g", "cl", "u"];

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

  const handleAddStep = () => {
    if (newStep.trim()) {
      const updatedSteps = [...steps, newStep.trim()];
      setSteps(updatedSteps);
      setRecipe({ ...recipe, steps: updatedSteps });
      setNewStep("");
    }
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    setSteps(updatedSteps);
    setRecipe({ ...recipe, steps: updatedSteps });
  };

  const handleSave = async () => {
    if (!recipe.name?.trim()) {
      Alert.alert('Erreur', 'Le nom de la recette est obligatoire');
      return;
    }

    try {
      // Créer la recette
      const newRecipe: Recipe = {
        id: Date.now(),
        name: recipe.name,
        description: recipe.description || "",
        imageUri: recipe.imageUri || "",
        steps: recipe.steps || [],
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
          const newIngredientEntity: Ingredient = {
            id: Date.now() + Math.random(),
            name: ingredient.name,
          };
          await IngredientManager.saveIngredient(newIngredientEntity);
          ingredientId = newIngredientEntity.id;
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
        const recipeTag: RecipeTag = {
          recipeId: newRecipe.id,
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
    <View style={styles.container}>
      <Header 
        title="Nouvelle Recette" 
        rightElement={
          <Button
            title="Enregistrer"
            icon="save"
            onPress={handleSave}
            size="small"
            variant="primary"
          />
        }
      />
      
      <KeyboardAwareScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraHeight={100}
        extraScrollHeight={100}
      >
        {/* Recipe Info Card */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          
          <Input
            label="Nom de la recette *"
            value={recipe.name}
            onChangeText={name => setRecipe({ ...recipe, name })}
            placeholder="Ex: Pasta Carbonara"
            variant="outlined"
          />
          
          <Input
            label="Description"
            value={recipe.description}
            onChangeText={description => setRecipe({ ...recipe, description })}
            placeholder="Description de la recette..."
            variant="outlined"
            multiline
            numberOfLines={3}
          />
          
          <Input
            label="URL de l'image"
            value={recipe.imageUri}
            onChangeText={imageUri => setRecipe({ ...recipe, imageUri })}
            placeholder="https://..."
            variant="outlined"
            icon="link"
          />
        </Card>

        {/* Ingredients Card */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Ingrédients</Text>
          
          {/* Ingredients List */}
          <View style={styles.ingredientsList}>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientIcon}>
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} />
                </View>
                <View style={styles.ingredientContent}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientQuantity}>
                    {formatQuantity(ingredient.quantity, ingredient.unit)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveIngredient(index)}
                  style={styles.removeButton}
                >
                  <FontAwesome name="times" size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Add Ingredient Form */}
          <View style={styles.addIngredientSection}>
            <Text style={styles.subsectionTitle}>Ajouter un ingrédient</Text>
            
            <Input
              label="Nom de l'ingrédient"
              value={newIngredient.name}
              onChangeText={name => setNewIngredient({ ...newIngredient, name })}
              placeholder="Ex: Pâtes"
              variant="outlined"
            />
            
            <View style={styles.quantityRow}>
              <View style={styles.quantityInput}>
                <Input
                  label="Quantité"
                  value={newIngredient.quantity.toString()}
                  onChangeText={text => {
                    const quantity = parseInt(text) || 1;
                    setNewIngredient({ ...newIngredient, quantity });
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                  variant="outlined"
                />
              </View>
              
              <View style={styles.unitInput}>
                <Text style={styles.inputLabel}>Unité</Text>
                <TouchableOpacity
                  style={styles.unitSelector}
                  onPress={() => setUnitModalVisible(true)}
                >
                  <Text style={styles.unitText}>{newIngredient.unit}</Text>
                  <FontAwesome name="chevron-down" size={12} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <Button
              title="Ajouter l'ingrédient"
              icon="plus"
              onPress={handleAddIngredient}
              variant="outline"
              style={styles.addIngredientButton}
            />
          </View>
        </Card>

        {/* Tags Card */}
        {availableTags.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            
            <View style={styles.tagsContainer}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag.id) && styles.tagChipSelected
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag.id) && styles.tagTextSelected
                  ]}>
                    {tag.name}
                  </Text>
                  {selectedTags.includes(tag.id) && (
                    <FontAwesome name="check" size={12} color={theme.colors.surface} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Steps Card */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Étapes de préparation</Text>
          
          {/* Steps List */}
          <View style={styles.stepsList}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeStepButton}
                  onPress={() => handleRemoveStep(index)}
                >
                  <FontAwesome name="trash" size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Current Step Input */}
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{steps.length + 1}</Text>
              </View>
              <View style={styles.stepInputWrapper}>
                <Input
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder={`Étape ${steps.length + 1}...`}
                  variant="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.stepInput}
                  onSubmitEditing={handleAddStep}
                />
              </View>
              {newStep.trim() && (
                <TouchableOpacity
                  style={styles.addStepButton}
                  onPress={handleAddStep}
                >
                  <FontAwesome name="check" size={16} color={theme.colors.surface} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </KeyboardAwareScrollView>

      {/* Unit Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={unitModalVisible}
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setUnitModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une unité</Text>
            {availableUnits.map(unit => (
              <TouchableOpacity
                key={unit}
                style={styles.unitOption}
                onPress={() => {
                  setNewIngredient({ ...newIngredient, unit });
                  setUnitModalVisible(false);
                }}
              >
                <Text style={styles.unitOptionText}>{unit}</Text>
                {newIngredient.unit === unit && (
                  <FontAwesome name="check" size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  
  section: {
    marginBottom: theme.spacing.lg,
  },
  
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  
  subsectionTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  
  ingredientsList: {
    marginBottom: theme.spacing.lg,
  },
  
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  
  ingredientIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  ingredientContent: {
    flex: 1,
  },
  
  ingredientName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  
  ingredientQuantity: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  removeButton: {
    padding: theme.spacing.sm,
  },
  
  addIngredientSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.lg,
  },
  
  quantityRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  
  quantityInput: {
    flex: 1,
  },
  
  unitInput: {
    width: 100,
  },
  
  inputLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
  },
  
  unitText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  
  addIngredientButton: {
    marginTop: theme.spacing.md,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
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
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  
  unitOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  
  // Styles pour les étapes
  stepsList: {
    marginBottom: theme.spacing.lg,
  },
  
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  
  stepNumberText: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  
  stepInput: {
    flex: 1,
    minHeight: 80,
  },
  
  stepInputWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  
  stepContent: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  stepText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  
  removeStepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  addStepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    ...theme.shadows.small,
  },
});
