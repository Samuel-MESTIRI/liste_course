// Page d'affichage des tags prédéfinis
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RecipeTagManager, TagManager } from "../src/services/storage";
import { Tag } from "../src/types";

export default function ManageTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [usageCount, setUsageCount] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const allTags = await TagManager.getTags();
      const recipeTags = await RecipeTagManager.getRecipeTags();
      
      // Compter l'utilisation de chaque tag
      const usage: Record<number, number> = {};
      allTags.forEach(tag => {
        usage[tag.id] = recipeTags.filter(rt => rt.tagId === tag.id).length;
      });
      
      setTags(allTags);
      setUsageCount(usage);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    } finally {
      setIsLoading(false);
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 Tags Disponibles</Text>
        <Text style={styles.subtitle}>Tags prédéfinis pour classifier vos recettes</Text>
      </View>

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        renderItem={({ item: tag }) => (
          <View style={styles.tagCard}>
            <View style={styles.tagInfo}>
              <Text style={styles.tagName}>{tag.name}</Text>
              <Text style={styles.usageText}>
                Utilisé dans {usageCount[tag.id] || 0} recette(s)
              </Text>
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{tag.name}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun tag disponible</Text>
        }
      />

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ À propos des tags</Text>
        <Text style={styles.infoText}>
          Ces tags sont prédéfinis et ne peuvent pas être modifiés. 
          Vous pouvez les utiliser pour classifier vos recettes lors de leur création ou modification.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    padding: 16,
  },
  tagCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  usageText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tagBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 32,
  },
  infoCard: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
