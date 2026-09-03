import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Btn({ title, onPress, variant = "primary", disabled, loading, icon }) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#58a6ff" : "#fff"} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons
              name={icon}
              size={17}
              color={variant === "secondary" ? "#c9d1d9" : "#fff"}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text style={[styles.text, variant === "secondary" && styles.textSecondary]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primary: {
    backgroundColor: "#238636",
    shadowColor: "#238636",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  secondary: { backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d" },
  danger: {
    backgroundColor: "#da3633",
    shadowColor: "#da3633",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  disabled: { opacity: 0.45 },
  text: { color: "#fff", fontWeight: "600", fontSize: 15 },
  textSecondary: { color: "#c9d1d9" },
});
