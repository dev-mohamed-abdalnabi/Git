import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadSettings } from "../services/storage";
import { getFileRaw, upsertSingleFile, deleteFile } from "../services/githubApi";
import Btn from "../components/Btn";

// base64 <-> utf8 helpers (React Native js engine بيدعم atob/btoa غالباً، ده fallback بسيط)
function b64decode(b64) {
  try {
    return decodeURIComponent(
      atob(b64.replace(/\n/g, ""))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    return atob(b64.replace(/\n/g, ""));
  }
}
function b64encode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode("0x" + p1)
    )
  );
}

export default function FileViewScreen({ route, navigation }) {
  const { owner, repo, branch, path } = route.params;
  const [content, setContent] = useState("");
  const [sha, setSha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [isBinary, setIsBinary] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: path.split("/").pop() });
    (async () => {
      try {
        const s = await loadSettings();
        setToken(s.token);
        const data = await getFileRaw(s.token, owner, repo, path, branch);
        setSha(data.sha);
        try {
          setContent(b64decode(data.content));
        } catch (e) {
          setIsBinary(true);
        }
      } catch (e) {
        Alert.alert("خطأ", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const b64 = b64encode(content);
      const res = await upsertSingleFile(
        token,
        owner,
        repo,
        path,
        b64,
        `Update ${path} via GitMobile`,
        branch,
        sha
      );
      setSha(res.content.sha);
      Alert.alert("تم", "الملف اتحدث");
    } catch (e) {
      Alert.alert("خطأ", e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert("تأكيد", "هتحذف الملف ده؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFile(token, owner, repo, path, `Delete ${path}`, branch, sha);
            navigation.goBack();
          } catch (e) {
            Alert.alert("خطأ", e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (isBinary) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 20 }}>
          <Text style={styles.info}>ده ملف باينري (صورة/فيديو/... إلخ) - مينفعش يتعرض كنص.</Text>
          <Btn title="حذف الملف" icon="trash-outline" variant="danger" onPress={onDelete} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <TextInput
          style={styles.editor}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <Btn title={saving ? "جاري الحفظ..." : "حفظ التعديلات"} icon="save-outline" loading={saving} onPress={onSave} />
        <Btn title="حذف الملف" icon="trash-outline" variant="danger" onPress={onDelete} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  editor: {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    borderRadius: 10,
    padding: 12,
    minHeight: 400,
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  info: { color: "#c9d1d9", marginBottom: 20 },
});
