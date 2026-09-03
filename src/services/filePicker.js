// src/services/filePicker.js
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

const { StorageAccessFramework } = FileSystem;

// أي عملية بتاخد وقت أكتر من كده (بالميلي ثانية) بتتلغى تلقائي بدل ما تعلّق التطبيق للأبد
const OP_TIMEOUT = 60000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), OP_TIMEOUT)
    ),
  ]);
}

/**
 * اختيار فولدر كامل من الجهاز (Android فقط) والمحافظة على شكله بالكامل
 * بيرجع array: [{ path: "relative/path/inside/folder.ext", base64: "..." }]
 */
// بياخد آخر جزء حقيقي من اسم/مسار الملف بعد فك التشفير الكامل للرابط.
// مهم: لازم نـ decode الرابط *كله* الأول، لأن الـ documentId بتاع SAF
// بيكون فيه المسار النسبي كله مشفّر بـ %2F مكان "/". لو عملنا split قبل
// الـ decode أو فكينا فك ناقص، بنطلع بالمسار الكامل بدل اسم العنصر بس -
// وده اللي كان بيسبب تكرار المسار ("فولدر جوه فولدر").
function lastSegment(uri) {
  let decoded;
  try {
    decoded = decodeURIComponent(uri);
  } catch (e) {
    decoded = uri;
  }
  const parts = decoded.split("/");
  return (parts[parts.length - 1] || "").split("?")[0];
}

// SAF (روابط content:// بتاعة أندرويد) مالهاش getInfoAsync موثوق لمعرفة
// فولدر ولا ملف - كتير بيرجع النتيجة غلط فيتم تجاهل الفولدر بالكامل.
// الطريقة المضمونة: نحاول نـ"سرد" الرابط كأنه فولدر؛ لو نجحت فعلاً فولدر
// (حتى لو فاضي)، لو رمت error يبقى ملف عادي.
async function tryListAsDirectory(uri) {
  try {
    const children = await StorageAccessFramework.readDirectoryAsync(uri);
    return { isDirectory: true, children };
  } catch (e) {
    return { isDirectory: false, children: null };
  }
}

export async function pickFolderRecursive(onProgress) {
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("مفيش صلاحية اختيار فولدر");
  }
  const rootUri = perm.directoryUri;
  const rootName = lastSegment(rootUri);

  const results = [];
  await walk(rootUri, rootName, results, onProgress);

  if (results.length === 0) {
    throw new Error("الفولدر ده فاضي أو مفيش ملفات ظهرتلنا جواه");
  }
  return results;
}

async function walk(uri, relativePrefix, results, onProgress) {
  const children = await withTimeout(
    StorageAccessFramework.readDirectoryAsync(uri),
    `قراءة ${relativePrefix}`
  );

  for (const childUri of children) {
    const name = lastSegment(childUri);
    const childRelativePath = `${relativePrefix}/${name}`;

    // بنحدد فولدر ولا ملف عن طريق محاولة سرده كفولدر - مش عن طريق
    // getInfoAsync اللي مش موثوق مع روابط SAF
    let dirCheck;
    try {
      dirCheck = await withTimeout(
        tryListAsDirectory(childUri),
        `فحص ${childRelativePath}`
      );
    } catch (e) {
      console.warn(`اتخطى ${childRelativePath}: ${e.message}`);
      continue;
    }

    if (dirCheck.isDirectory) {
      await walk(childUri, childRelativePath, results, onProgress);
    } else {
      try {
        const base64 = await withTimeout(
          FileSystem.readAsStringAsync(childUri, {
            encoding: FileSystem.EncodingType.Base64,
          }),
          `قراءة ${childRelativePath}`
        );
        results.push({ path: childRelativePath, base64 });
        if (onProgress) onProgress(results.length);
      } catch (e) {
        console.warn(`اتخطى ${childRelativePath}: ${e.message}`);
      }
    }
  }
}

/**
 * اختيار عدة ملفات منفصلة (يشتغل على Android وiOS)
 */
export async function pickMultipleFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: "*/*",
  });

  if (result.canceled) return [];

  const assets = result.assets || [];
  const files = [];
  for (const asset of assets) {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    files.push({ path: asset.name, base64 });
  }
  return files;
}
