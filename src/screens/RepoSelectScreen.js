import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loadSettings } from "../services/storage";
import { listUserRepos, listBranches } from "../services/githubApi";

export default function RepoSelectScreen({ navigation }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      if (!s.token) {
        Alert.alert("لازم تعمل إعدادات الأول", "دخل التوكن في شاشة الإعدادات");
        navigation.replace("Settings");
        return;
      }
      setToken(s.token);
      try {
        const data = await listUserRepos(s.token);
        setRepos(data);
      } catch (e) {
        Alert.alert("خطأ", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openRepo = async (repo) => {
    try {
      const branches = await listBranches(token, repo.owner.login, repo.name);
      navigation.navigate("Explorer", {
        owner: repo.owner.login, repo: repo.name, branch: repo.default_branch,
        branches: branches.map((b) => b.name), path: "",
      });
    } catch (e) {
      Alert.alert("خطأ", e.message);
    }
  };

  const filtered = query ? repos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase())) : repos;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#58a6ff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#8b949e" />
        <TextInput
          style={styles.searchInput}
          placeholder="دور على ريبو..."
          placeholderTextColor="#6e7681"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openRepo(item)} activeOpacity={0.75}>
            <View style={styles.iconWrap}>
              <Ionicons name="book-outline" size={19} color="#58a6ff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.repoName} numberOfLines={1}>{item.full_name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name={item.private ? "lock-closed" : "globe-outline"} size={11} color="#8b949e" />
                <Text style={styles.repoMeta}>{item.private ? "خاص" : "عام"} · {item.default_branch}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#484f58" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#161b22", borderRadius: 10,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#30363d", gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#161b22", borderRadius: 12,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#30363d", gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#58a6ff22",
    alignItems: "center", justifyContent: "center",
  },
  repoName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  repoMeta: { color: "#8b949e", fontSize: 11 },
});
