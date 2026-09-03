// src/services/storage.js
// تخزين آمن للتوكن والإعدادات على الجهاز (مش هارد كودد أبداً في الكود)
import * as SecureStore from "expo-secure-store";

const KEYS = {
  TOKEN: "gh_token",
  USERNAME: "gh_username",
  DEFAULT_REPO: "gh_default_repo",
  DEFAULT_BRANCH: "gh_default_branch",
};

export async function saveSettings({ token, username, defaultRepo, defaultBranch }) {
  if (token !== undefined) await SecureStore.setItemAsync(KEYS.TOKEN, token || "");
  if (username !== undefined) await SecureStore.setItemAsync(KEYS.USERNAME, username || "");
  if (defaultRepo !== undefined)
    await SecureStore.setItemAsync(KEYS.DEFAULT_REPO, defaultRepo || "");
  if (defaultBranch !== undefined)
    await SecureStore.setItemAsync(KEYS.DEFAULT_BRANCH, defaultBranch || "");
}

export async function loadSettings() {
  const [token, username, defaultRepo, defaultBranch] = await Promise.all([
    SecureStore.getItemAsync(KEYS.TOKEN),
    SecureStore.getItemAsync(KEYS.USERNAME),
    SecureStore.getItemAsync(KEYS.DEFAULT_REPO),
    SecureStore.getItemAsync(KEYS.DEFAULT_BRANCH),
  ]);
  return {
    token: token || "",
    username: username || "",
    defaultRepo: defaultRepo || "",
    defaultBranch: defaultBranch || "main",
  };
}

export async function clearSettings() {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
