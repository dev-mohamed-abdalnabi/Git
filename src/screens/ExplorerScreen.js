import React, { useCallback, useEffect, useState } from "react";
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
import {
  listContents,
  deleteFile,
  deleteFolder,
  createBranch,
} from "../services/githubApi";
import Btn from "../components/Btn";

export default function ExplorerScreen({ route, navigation }) {
  const { owner, repo, branch: initialBranch, branches, path: initialPath } = route.params;
  const [branch, setBranch] = useState(initialBranch);
  const [path, setPath] = useState(initialPath || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await loadSettings();
      setToken(s.token);
      if (path === "" ) {
        const data = await listContents(s.token, owner, repo, "", branch);
        setItems(sortItems(data));
      } else {
        const data = await listContents(s.token, owner, repo, path, branch);
        setItems(sortItems(data));
      }
    } catch (e) {
      Alert.alert("خطأ", e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [owner, repo, branch, path]);

  useEffect(() => {
    navigation.setOptions({ title: `${repo} — ${branch} — /${path}` });
    load();
  }, [load]);

  const sortItems = (data) =>
    [...data].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    });

  const openItem = (item) => {
    if (item.type === "dir") {
      navigation.push("Explorer", {
        owner,
        repo,
        branch,
        branches,
        path: item.path,
      });
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
            if (item.type === "dir") {
              await deleteFolder(token, owner, repo, item.path, `Delete folder ${item.path}`, branch);
            } else {
              await deleteFile(token, owner, repo, item.path, `Delete ${item.path}`, branch, item.sha);
            }
            load();
          } catch (e) {
            Alert.alert("خطأ", e.message);
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

  const onNewBranch = () => {
    Alert.prompt?.(
      "اسم الفرع الجديد",
      `هيتعمل من ${branch}`,
      async (name) => {
        if (!name) return;
        try {
          await createBranch(token, owner, repo, branch, name);
          Alert.alert("تم", `اتعمل فرع ${name}`);
        } catch (e) {
          Alert.alert("خطأ", e.message);
        }
      }
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onSwitchBranch} style={styles.branchPill}>
          <Text style={styles.branchText}>🌿 {branch}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => navigation.navigate("Upload", { owner, repo, branch, path })}
        >
          <Text style={styles.uploadText}>⬆️ رفع هنا</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.sha + item.path}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>الفولدر ده فاضي</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openItem(item)}>
                <Text style={styles.itemText}>
                  {item.type === "dir" ? "📁" : "📄"} {item.name}
                </Text>
                {item.type === "file" && (
                  <Text style={styles.itemMeta}>{(item.size / 1024).toFixed(1)} KB</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteBtn}>
                <Text style={{ color: "#f85149" }}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: "#161b22",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  branchText: { color: "#58a6ff", fontSize: 13 },
  uploadBtn: {
    backgroundColor: "#238636",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  itemText: { color: "#fff", fontSize: 15 },
  itemMeta: { color: "#8b949e", fontSize: 11, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 40 },
});
