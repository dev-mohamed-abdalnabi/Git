import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";

export default function Btn({ title, onPress, variant = "primary", disabled, loading }) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primary: { backgroundColor: "#238636" },
  secondary: { backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d" },
  danger: { backgroundColor: "#da3633" },
  disabled: { opacity: 0.5 },
  text: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
