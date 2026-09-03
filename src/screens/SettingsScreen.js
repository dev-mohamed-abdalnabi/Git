import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Btn from "../components/Btn";
import { saveSettings, loadSettings, clearSettings } from "../services/storage";
import { listUserRepos } from "../services/githubApi";

export default function SettingsScreen({ navigation }) {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [defaultRepo, setDefaultRepo] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setToken(s.token);
      setUsername(s.username);
      setDefaultRepo(s.defaultRepo);
      setDefaultBranch(s.defaultBranch);
    })();
  }, []);

  const onSave = async () => {
    if (!token.trim()) {
      Alert.alert("خطأ", "لازم تدخل الـ GitHub Token");
      return;
    }
    setLoading(true);
    try {
      await saveSettings({ token: token.trim(), username: username.trim(), defaultRepo: defaultRepo.trim(), defaultBranch: defaultBranch.trim() || "main" });
      Alert.alert("تم", "الإعدادات اتحفظت بأمان على الجهاز");
    } catch (e) {
      Alert.alert("خطأ", e.message);
    } finally {
      setLoading(false);
    }
  };

  const onTestToken = async () => {
    if (!token.trim()) {
      Alert.alert("خطأ", "دخل التوكن الأول");
      return;
    }
    setTesting(true);
    try {
      const repos = await listUserRepos(token.trim());
      Alert.alert("تمام", `التوكن شغال، لقينا ${repos.length} ريبو`);
    } catch (e) {
      Alert.alert("فشل", e.message);
    } finally {
      setTesting(false);
    }
  };

  const onClear = async () => {
    Alert.alert("تأكيد", "هيمسح التوكن وكل الإعدادات من الجهاز؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح",
        style: "destructive",
        onPress: async () => {
          await clearSettings();
          setToken("");
          setUsername("");
          setDefaultRepo("");
          setDefaultBranch("main");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>الإعدادات</Text>

        <Text style={styles.label}>GitHub Personal Access Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="ghp_xxxxxxxxxxxx"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>اسم المستخدم (Username)</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="dev-mohamed-abdalnabi"
          autoCapitalize="none"
        />

        <Text style={styles.label}>الريبو الافتراضي (اختياري - owner/repo)</Text>
        <TextInput
          style={styles.input}
          value={defaultRepo}
          onChangeText={setDefaultRepo}
          placeholder="dev-mohamed-abdalnabi/mem"
          autoCapitalize="none"
        />

        <Text style={styles.label}>الفرع الافتراضي</Text>
        <TextInput
          style={styles.input}
          value={defaultBranch}
          onChangeText={setDefaultBranch}
          placeholder="main"
          autoCapitalize="none"
        />

        <Btn title={testing ? "جاري الاختبار..." : "اختبار التوكن"} onPress={onTestToken} disabled={testing} variant="secondary" />
        <Btn title={loading ? "جاري الحفظ..." : "حفظ الإعدادات"} onPress={onSave} disabled={loading} />
        <Btn title="اذهب للريبوهات" onPress={() => navigation.navigate("RepoSelect")} variant="secondary" />
        <Btn title="مسح كل البيانات" onPress={onClear} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 10 },
  label: { color: "#c9d1d9", marginTop: 8, marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
});
