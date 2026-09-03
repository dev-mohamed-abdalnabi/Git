import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadSettings } from "../services/storage";
import { listUserRepos, listBranches } from "../services/githubApi";

export default function RepoSelectScreen({ navigation }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

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
        owner: repo.owner.login,
        repo: repo.name,
        branch: repo.default_branch,
        branches: branches.map((b) => b.name),
        path: "",
      });
    } catch (e) {
      Alert.alert("خطأ", e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={repos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openRepo(item)}>
            <Text style={styles.repoName}>{item.full_name}</Text>
            <Text style={styles.repoMeta}>
              {item.private ? "🔒 خاص" : "🌐 عام"} · الفرع الافتراضي: {item.default_branch}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  repoName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  repoMeta: { color: "#8b949e", fontSize: 12, marginTop: 4 },
});
