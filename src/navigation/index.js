import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "../screens/SettingsScreen";
import RepoSelectScreen from "../screens/RepoSelectScreen";
import ExplorerScreen from "../screens/ExplorerScreen";
import UploadScreen from "../screens/UploadScreen";
import FileViewScreen from "../screens/FileViewScreen";

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0d1117",
    card: "#161b22",
    text: "#ffffff",
    border: "#30363d",
    primary: "#58a6ff",
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: "#161b22" },
  headerTintColor: "#c9d1d9",
  headerTitleStyle: { fontWeight: "700" },
  headerShadowVisible: false,
};

export default function RootNavigation() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Settings" screenOptions={screenOptions}>
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "GitMobile" }} />
        <Stack.Screen name="RepoSelect" component={RepoSelectScreen} options={{ title: "الريبوهات" }} />
        <Stack.Screen name="Explorer" component={ExplorerScreen} options={{ title: "استعراض الملفات" }} />
        <Stack.Screen name="Upload" component={UploadScreen} options={{ title: "رفع ملفات" }} />
        <Stack.Screen name="FileView" component={FileViewScreen} options={{ title: "الملف" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
