import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../styles/theme";
import { RecipeItemProps } from "../types";
import { Button } from "./Button";
import { Card } from "./Card";

export const RecipeItem: React.FC<RecipeItemProps> = ({
  recipe,
  isFavorite,
  favoriteAnimation,
  showFoodAnimation,
  foodAnimations,
  onToggleFavorite,
  onAddToShoppingList,
}) => {
  const router = useRouter();
  const foodEmojis = ['🥕', '🥩', '🍎']; // Carotte, Viande, Pomme

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
                      scale: favoriteAnimation || 1
                    }
                  ]
                }}
              >
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => onToggleFavorite(recipe.id)}
                >
                  <FontAwesome
                    name={isFavorite ? "heart" : "heart-o"}
                    size={20}
                    color={isFavorite ? theme.colors.error : theme.colors.textSecondary}
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
                onPress={() => onAddToShoppingList(recipe.id)}
                style={styles.addToListButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Animation des icônes de nourriture */}
      {showFoodAnimation && foodAnimations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.foodIcon,
            {
              transform: [
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -350], // Vers la gauche encore plus loin
                  }),
                },
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -30, 0], // Légère courbe vers le haut puis vers le bas
                  }),
                },
                {
                  scale: anim.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0.5, 1.2, 1, 0.8], // Grossit puis rapetisse
                  }),
                },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0], // Apparaît puis disparaît
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

const styles = StyleSheet.create({
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
  
  addToListButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
});
