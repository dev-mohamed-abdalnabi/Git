// src/utils/fileIcons.js
// بيحدد أيقونة ولون مناسبين لكل نوع ملف بدل الإيموجي

const MAP = {
  // code
  js: { icon: "logo-javascript", color: "#f1e05a" },
  jsx: { icon: "logo-react", color: "#61dafb" },
  ts: { icon: "code-slash", color: "#3178c6" },
  tsx: { icon: "logo-react", color: "#61dafb" },
  json: { icon: "braces-outline", color: "#8b949e" },
  html: { icon: "logo-html5", color: "#e34c26" },
  css: { icon: "logo-css3", color: "#563d7c" },
  py: { icon: "logo-python", color: "#3572A5" },
  java: { icon: "cafe-outline", color: "#b07219" },
  kt: { icon: "code-slash", color: "#A97BFF" },
  swift: { icon: "logo-apple", color: "#ffac45" },
  // docs
  md: { icon: "document-text-outline", color: "#c9d1d9" },
  txt: { icon: "document-text-outline", color: "#c9d1d9" },
  pdf: { icon: "document-outline", color: "#f85149" },
  // media
  png: { icon: "image-outline", color: "#58a6ff" },
  jpg: { icon: "image-outline", color: "#58a6ff" },
  jpeg: { icon: "image-outline", color: "#58a6ff" },
  gif: { icon: "image-outline", color: "#58a6ff" },
  svg: { icon: "image-outline", color: "#58a6ff" },
  mp4: { icon: "videocam-outline", color: "#a371f7" },
  mov: { icon: "videocam-outline", color: "#a371f7" },
  mp3: { icon: "musical-notes-outline", color: "#a371f7" },
  // config / misc
  yml: { icon: "settings-outline", color: "#8b949e" },
  yaml: { icon: "settings-outline", color: "#8b949e" },
  gitignore: { icon: "eye-off-outline", color: "#8b949e" },
  lock: { icon: "lock-closed-outline", color: "#8b949e" },
  zip: { icon: "archive-outline", color: "#d29922" },
  apk: { icon: "logo-android", color: "#3ddc84" },
};

const DEFAULT = { icon: "document-outline", color: "#8b949e" };
export const FOLDER_ICON = { icon: "folder", color: "#58a6ff" };

export function getFileIcon(name) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return MAP[ext] || DEFAULT;
}
