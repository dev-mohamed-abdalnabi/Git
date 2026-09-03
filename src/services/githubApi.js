// src/services/githubApi.js
// كل التعامل مع GitHub REST + Git Data API بيحصل هنا

const BASE = "https://api.github.com";

function encodePath(path = "") {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function authHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `GitHub API error (${res.status})`;
    try {
      const body = await res.json();
      msg += `: ${body.message || JSON.stringify(body)}`;
      if (body.errors) msg += ` (${JSON.stringify(body.errors)})`;
    } catch (e) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Repos & Branches ----------

export async function listUserRepos(token) {
  return ghFetch(`${BASE}/user/repos?per_page=100&sort=updated`, token);
}

export async function listBranches(token, owner, repo) {
  return ghFetch(`${BASE}/repos/${owner}/${repo}/branches?per_page=100`, token);
}

export async function createBranch(token, owner, repo, baseBranch, newBranch) {
  const baseRef = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    token
  );
  return ghFetch(`${BASE}/repos/${owner}/${repo}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${newBranch}`,
      sha: baseRef.object.sha,
    }),
  });
}

// ---------- Browse contents ----------

export async function listContents(token, owner, repo, path = "", branch) {
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const data = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
    token
  );
  // data can be array (dir) or object (single file)
  return Array.isArray(data) ? data : [data];
}

export async function getFileRaw(token, owner, repo, path, branch) {
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const data = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
    token
  );
  return data; // includes .content (base64) and .sha
}

// ---------- Single file create/update/delete (simple cases) ----------

export async function upsertSingleFile(
  token,
  owner,
  repo,
  path,
  base64Content,
  message,
  branch,
  existingSha
) {
  return ghFetch(`${BASE}/repos/${owner}/${repo}/contents/${encodePath(path)}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
}

export async function deleteFile(token, owner, repo, path, message, branch, sha) {
  // SHA الموجود في شاشة التصفح قديم إذا تغيّر الملف منذ فتح الشاشة.
  // جلب النسخة الحالية يمنع خطأ 409/422 أثناء الحذف.
  let currentSha = sha;
  try {
    const latest = await getFileRaw(token, owner, repo, path, branch);
    currentSha = latest.sha;
  } catch (e) {
    // نستخدم SHA المرسل كحل أخير، وستظهر رسالة GitHub الأصلية إن كان غير صالح.
  }
  return ghFetch(`${BASE}/repos/${owner}/${repo}/contents/${encodePath(path)}`, token, {
    method: "DELETE",
    body: JSON.stringify({ message, branch, sha: currentSha }),
  });
}

export async function deleteFolder(token, owner, repo, folderPath, message, branch) {
  // GitHub لا يحذف الفولدر مباشرة. نجيب الملفات ثم نحذفها واحدًا واحدًا
  // عبر Contents API؛ كل طلب يأخذ أحدث SHA ويعمل commit طبيعي، فلا يحدث
  // خطأ "Update is not a fast forward" الناتج عن تحريك ref يدويًا.
  const { treeSha } = await getBranchHeadTree(token, owner, repo, branch);
  const fullTree = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    token
  );
  const files = fullTree.tree.filter(
    (item) => item.type === "blob" && item.path.startsWith(folderPath.replace(/\/$/, "") + "/")
  );
  if (files.length === 0) throw new Error("الفولدر فاضي أو اتغير قبل الحذف، اعمل تحديث وجرب تاني");
  for (const file of files) {
    await deleteFile(token, owner, repo, file.path, message, branch, file.sha);
  }
  return { deleted: files.length };
}

// ---------- Multi-file commit (preserves folder structure) ----------

async function getBranchHeadTree(token, owner, repo, branch) {
  const ref = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  const commit = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    token
  );
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

/**
 * files: [{ path: "folder/sub/file.png", base64: "..." }, ...]
 * path هو المسار الكامل جوه الريبو (بيحافظ على شكل الفولدر زي ما هو في الجهاز)
 */
export async function commitMultipleFiles(
  token,
  owner,
  repo,
  branch,
  files,
  message,
  onProgress
) {
  const MAX_RETRIES = 5;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { commitSha, treeSha } = await getBranchHeadTree(token, owner, repo, branch);

      const blobs = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const blob = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/blobs`, token, {
          method: "POST",
          body: JSON.stringify({ content: f.base64, encoding: "base64" }),
        });
        blobs.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
        if (onProgress) onProgress(i + 1, files.length);
      }

      const newTree = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/trees`, token, {
        method: "POST",
        body: JSON.stringify({ base_tree: treeSha, tree: blobs }),
      });

      const newCommit = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/commits`, token, {
        method: "POST",
        body: JSON.stringify({ message, tree: newTree.sha, parents: [commitSha] }),
      });

      // لو حد تاني (أو رفعة سابقة) غيّر الفرع في نفس اللحظة، PATCH هترفض بـ 422
      // "Update is not a fast forward" - في الحالة دي بنعيد الخطوات كلها من جديد
      // على أحدث نسخة من الفرع بدل ما نفشل خالص
      await ghFetch(`${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
      });

      return newCommit;
    } catch (e) {
      lastError = e;
      const isConflict =
        e.message.includes("422") ||
        e.message.toLowerCase().includes("fast forward") ||
        e.message.toLowerCase().includes("update reference failed");
      if (isConflict && attempt < MAX_RETRIES) {
        if (onProgress) onProgress(0, files.length);
        // exponential backoff بدل زيادة خطية، عشان نديله وقت أكتر لو
        // في تعارض متكرر (تحديثات كتير على نفس الفرع في نفس اللحظة)
        await new Promise((r) => setTimeout(r, 600 * 2 ** (attempt - 1)));
        continue;
      }
      if (isConflict) {
        throw new Error(
          "الفرع اتغيّر من حد/رفعة تانية أثناء الرفع وحصل تعارض متكرر. جرب تاني بعد شوية."
        );
      }
      throw e;
    }
  }
  throw lastError;
}
