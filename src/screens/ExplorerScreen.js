import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loadSettings } from "../services/storage";
import {
  listContents,
  deleteFile,
  deleteFolder,
  createBranch,
} from "../services/githubApi";
import { getFileIcon, FOLDER_ICON } from "../utils/fileIcons";
import Breadcrumb from "../components/Breadcrumb";

export default function ExplorerScreen({ route, navigation }) {
  const { owner, repo, branch: initialBranch, branches, path: initialPath } = route.params;
  const [branch, setBranch] = useState(initialBranch);
  const [path, setPath] = useState(initialPath || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [deletingPath, setDeletingPath] = useState(null);

  const load = useCallback(async (isRefresh) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const s = await loadSettings();
      setToken(s.token);
      const data = await listContents(s.token, owner, repo, path, branch);
      setItems(sortItems(data));
    } catch (e) {
      Alert.alert("خطأ", e.message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [owner, repo, branch, path]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: repo,
      headerRight: () => (
        <TouchableOpacity onPress={() => setSearchOpen((v) => !v)} style={{ padding: 6 }}>
          <Ionicons name="search" size={20} color="#c9d1d9" />
        </TouchableOpacity>
      ),
    });
    load(false);
  }, [load]);

  const sortItems = (data) =>
    [...data].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    });

  const filtered = query
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  const openItem = (item) => {
    if (item.type === "dir") {
      navigation.push("Explorer", { owner, repo, branch, branches, path: item.path });
    } else {
      navigation.navigate("FileView", { owner, repo, branch, path: item.path, sha: item.sha });
    }
  };

  const onDelete = (item) => {
    Alert.alert("تأكيد الحذف", `هتحذف "${item.name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingPath(item.path);
            if (item.type === "dir") {
              await deleteFolder(token, owner, repo, item.path, `Delete folder ${item.path}`, branch);
            } else {
              await deleteFile(token, owner, repo, item.path, `Delete ${item.path}`, branch, item.sha);
            }
            load(false);
          } catch (e) {
            Alert.alert("خطأ", e.message);
          } finally {
            setDeletingPath(null);
          }
        },
      },
    ]);
  };

  const onSwitchBranch = () => {
    if (!branches || branches.length < 2) return;
    Alert.alert(
      "اختار فرع",
      "",
      branches.map((b) => ({ text: b, onPress: () => setBranch(b) })).concat([{ text: "إلغاء", style: "cancel" }])
    );
  };

  const onNavigateBreadcrumb = (target) => {
    if (target === path) return;
    navigation.push("Explorer", { owner, repo, branch, branches, path: target });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onSwitchBranch} style={styles.branchPill}>
          <Ionicons name="git-branch-outline" size={14} color="#58a6ff" />
          <Text style={styles.branchText}>{branch}</Text>
          {branches && branches.length > 1 && (
            <Ionicons name="chevron-down" size={12} color="#58a6ff" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => navigation.navigate("Upload", { owner, repo, branch, path })}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={styles.uploadText}>رفع هنا</Text>
        </TouchableOpacity>
      </View>

      <Breadcrumb repo={repo} path={path} onNavigate={onNavigateBreadcrumb} />

      {searchOpen && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#8b949e" />
          <TextInput
            style={styles.searchInput}
            placeholder="دور في الفولدر ده..."
            placeholderTextColor="#6e7681"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color="#6e7681" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#58a6ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.sha + item.path}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#58a6ff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="folder-open-outline" size={40} color="#30363d" />
              <Text style={styles.empty}>{query ? "مفيش نتايج" : "الفولدر ده فاضي"}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = item.type === "dir" ? FOLDER_ICON : getFileIcon(item.name);
            return (
              <View style={styles.row}>
                <TouchableOpacity style={styles.rowMain} onPress={() => openItem(item)} activeOpacity={0.7}>
                  <View style={[styles.iconWrap, { backgroundColor: meta.color + "22" }]}>
                    <Ionicons name={meta.icon} size={19} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemText} numberOfLines={1}>{item.name}</Text>
                    {item.type === "file" && (
                      <Text style={styles.itemMeta}>{(item.size / 1024).toFixed(1)} KB</Text>
                    )}
                  </View>
                  {item.type === "dir" && (
                    <Ionicons name="chevron-forward" size={16} color="#484f58" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteBtn} disabled={deletingPath !== null}>
                  {deletingPath === item.path ? <ActivityIndicator size="small" color="#f85149" /> : <Ionicons name="trash-outline" size={17} color="#f85149" />}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 6,
  },
  branchText: { color: "#58a6ff", fontSize: 13, fontWeight: "500" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#238636",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  uploadText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 4,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  itemMeta: { color: "#8b949e", fontSize: 11, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 10 },
  empty: { color: "#8b949e", fontSize: 14 },
});
