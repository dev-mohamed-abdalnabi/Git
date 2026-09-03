import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";

const ROOT = `${FileSystem.documentDirectory ? "file:///storage/emulated/0" : "/storage/emulated/0"}`;

function nameOf(uri) {
  return decodeURIComponent(uri.replace(/\/$/, "").split("/").pop() || "التخزين الداخلي");
}

export default function FileBrowserScreen({ navigation, route }) {
  const [folder, setFolder] = useState(route.params?.startPath || ROOT);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async (path) => {
    setLoading(true);
    try {
      const uris = await FileSystem.readDirectoryAsync(path);
      const entries = await Promise.all(uris.map(async (uri) => {
        const info = await FileSystem.getInfoAsync(uri);
        return { uri, name: nameOf(uri), isDirectory: !!info.isDirectory, size: info.size || 0 };
      }));
      setItems(entries.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name)));
    } catch (e) {
      Alert.alert("لا يمكن قراءة الملفات", "امنح التطبيق صلاحية إدارة كل الملفات من الزر الموجود بالأسفل ثم ارجع واضغط إعادة المحاولة.");
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(folder); }, [folder]);

  const choose = () => {
    navigation.navigate({ name: "Upload", params: { selectedFolderUri: folder }, merge: true });
  };

  return (
    <View style={styles.safe}>
      <View style={styles.path}><Ionicons name="folder-open" size={18} color="#58a6ff" /><Text style={styles.pathText} numberOfLines={1}>{folder}</Text></View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => Linking.openSettings()}>
          <Ionicons name="settings-outline" size={17} color="#c9d1d9" /><Text style={styles.actionText}>صلاحية الملفات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.choose} onPress={choose}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.chooseText}>اختيار هذا الفولدر</Text></TouchableOpacity>
      </View>
      {folder !== ROOT && <TouchableOpacity style={styles.up} onPress={() => setFolder(folder.substring(0, folder.lastIndexOf("/")) || ROOT)}><Ionicons name="arrow-up" size={18} color="#58a6ff" /><Text style={styles.upText}>فولدر أعلى</Text></TouchableOpacity>}
      {loading ? <ActivityIndicator color="#58a6ff" style={{ marginTop: 35 }} /> : <FlatList data={items} keyExtractor={(x) => x.uri} onRefresh={() => load(folder)} refreshing={loading} renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => item.isDirectory && setFolder(item.uri)} disabled={!item.isDirectory}>
          <Ionicons name={item.isDirectory ? "folder" : "document-outline"} size={25} color={item.isDirectory ? "#58a6ff" : "#8b949e"} />
          <View style={{ flex: 1 }}><Text style={styles.name} numberOfLines={1}>{item.name}</Text>{!item.isDirectory && <Text style={styles.meta}>{(item.size / 1024).toFixed(1)} KB</Text>}</View>
          {item.isDirectory && <Ionicons name="chevron-forward" size={18} color="#484f58" />}
        </TouchableOpacity>
      )} ListEmptyComponent={<Text style={styles.empty}>لا توجد ملفات أو لا توجد صلاحية قراءة</Text>} />}
    </View>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#0d1117", padding: 12 }, path: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#161b22", borderRadius: 10, padding: 12 }, pathText: { color: "#c9d1d9", flex: 1 }, actions: { flexDirection: "row", gap: 8, marginVertical: 10 }, action: { flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#30363d", borderRadius: 9, padding: 10 }, actionText: { color: "#c9d1d9", fontSize: 12 }, choose: { flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", alignItems: "center", backgroundColor: "#238636", borderRadius: 9, padding: 10 }, chooseText: { color: "#fff", fontSize: 12, fontWeight: "600" }, up: { flexDirection: "row", gap: 8, alignItems: "center", padding: 10 }, upText: { color: "#58a6ff" }, row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#161b22", borderRadius: 10, padding: 13, marginBottom: 7 }, name: { color: "#fff", fontSize: 15 }, meta: { color: "#8b949e", fontSize: 11, marginTop: 3 }, empty: { color: "#8b949e", textAlign: "center", marginTop: 40 }
});
