import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Header from "../src/components/Header";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          header: ({ route }) => {
            const routePath = route.name as string;
            
            // Personnalisation du titre en fonction de la route
            let title = "Liste de Courses";
            if (routePath === "recette") title = "📖 Mes Recettes";
            if (routePath === "ajouter-recette") title = "➕ Nouvelle Recette";
            if (routePath === "modifier-recette/[id]") title = "✏️ Modifier la Recette";

            // Ne pas afficher le bouton retour sur la page d'accueil
            const showBackButton = routePath !== "index";

            return <Header title={title} showBackButton={showBackButton} />;
          },
        }}
      />
    </GestureHandlerRootView>
  );
}
