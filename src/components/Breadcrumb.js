import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Breadcrumb({ repo, path, onNavigate }) {
  const parts = path ? path.split("/") : [];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wrap} contentContainerStyle={{ alignItems: "center" }}>
      <TouchableOpacity style={styles.crumb} onPress={() => onNavigate("")}>
        <Ionicons name="logo-github" size={14} color="#58a6ff" style={{ marginRight: 4 }} />
        <Text style={styles.crumbText}>{repo}</Text>
      </TouchableOpacity>
      {parts.map((part, idx) => {
        const target = parts.slice(0, idx + 1).join("/");
        return (
          <View key={target} style={styles.row}>
            <Ionicons name="chevron-forward" size={13} color="#484f58" />
            <TouchableOpacity style={styles.crumb} onPress={() => onNavigate(target)}>
              <Text style={styles.crumbText} numberOfLines={1}>{part}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 34, paddingHorizontal: 12, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center" },
  crumb: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  crumbText: { color: "#58a6ff", fontSize: 13, fontWeight: "500" },
});
