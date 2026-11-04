import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const MEDIA_BUCKET = "community-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const authPanel = document.getElementById("auth-panel");
const accountPanel = document.getElementById("account-panel");
const postPanel = document.getElementById("post-panel");
const authForm = document.getElementById("auth-form");
const profileForm = document.getElementById("profile-form");
const postForm = document.getElementById("post-form");
const statusMessage = document.getElementById("status-message");
const postsList = document.getElementById("posts-list");
const signInButton = document.getElementById("sign-in-button");
const signUpButton = document.getElementById("sign-up-button");
const saveProfileButton = document.getElementById("save-profile-button");
const publishButton = document.getElementById("publish-button");
const profileNameInput = document.getElementById("display-name");
const avatarFileInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function setBusy(button, busy, busyText) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.label;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function publicImageUrl(supabase, path) {
  return path
    ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
    : "";
}

function makeAvatar(supabase, profile, className = "post-avatar") {
  const image = document.createElement("img");
  image.className = className;
  image.alt = "";
  image.loading = "lazy";
  image.hidden = !profile?.avatar_path;
  if (profile?.avatar_path) {
    image.src = publicImageUrl(supabase, profile.avatar_path);
  }
  return image;
}

function appendComments(supabase, card, post, currentUser) {
  const commentSection = document.createElement("section");
  commentSection.className = "post-comments";
  const heading = document.createElement("h4");
  heading.textContent = `Bình luận (${post.post_comments.length})`;
  commentSection.append(heading);

  const commentList = document.createElement("div");
  commentList.className = "comment-list";
  for (const comment of post.post_comments) {
    const commentItem = document.createElement("article");
    commentItem.className = "comment-item";
    const avatar = makeAvatar(supabase, comment.profiles);
    const commentBody = document.createElement("div");
    commentBody.className = "comment-body";
    const author = document.createElement("p");
    author.className = "comment-meta";
    author.textContent = `${comment.profiles?.display_name || "Thành viên"} · ${formatDate(comment.created_at)}`;
    const content = document.createElement("p");
    content.className = "comment-content";
    content.textContent = comment.content;
    commentBody.append(author, content);
    commentItem.append(avatar, commentBody);
    commentList.append(commentItem);
  }
  commentSection.append(commentList);

  if (currentUser) {
    const form = document.createElement("form");
    form.className = "comment-form";
    const input = document.createElement("input");
    input.name = "content";
    input.required = true;
    input.maxLength = 2000;
    input.setAttribute("aria-label", "Nội dung bình luận");
    input.placeholder = "Viết bình luận...";
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Gửi";
    form.append(input, button);
    form.addEventListener("submit", (event) => {
      void submitComment(event, form, button, post.id, supabase);
    });
    commentSection.append(form);
  } else {
    const signInNote = document.createElement("p");
    signInNote.className = "muted";
    signInNote.textContent = "Đăng nhập để tham gia bình luận.";
    commentSection.append(signInNote);
  }
  card.append(commentSection);
}

function renderPosts(supabase, posts, currentUser) {
  postsList.replaceChildren();

  if (!posts.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Chưa có bài đăng nào. Hãy chia sẻ điều đầu tiên!";
    postsList.append(emptyState);
    return;
  }

  for (const post of posts) {
    const card = document.createElement("article");
    card.className = "post-card";
    const authorRow = document.createElement("div");
    authorRow.className = "post-author";
    authorRow.append(makeAvatar(supabase, post.profiles));
    const meta = document.createElement("p");
    meta.className = "post-meta";
    meta.textContent = `${post.profiles?.display_name || "Thành viên"} · ${formatDate(post.created_at)}`;
    authorRow.append(meta);

    const title = document.createElement("h3");
    title.textContent = post.title;
    card.append(authorRow, title);

    if (post.literary_work) {
      const literaryWork = document.createElement("p");
      literaryWork.className = "post-literary-work";
      literaryWork.textContent = post.literary_work;
      card.append(literaryWork);
    }

    if (post.image_path) {
      const image = document.createElement("img");
      image.className = "post-image";
      image.src = publicImageUrl(supabase, post.image_path);
      image.alt = `Ảnh minh họa cho ${post.title}`;
      image.loading = "lazy";
      card.append(image);
    }

    const analysis = document.createElement("p");
    analysis.className = "post-analysis";
    analysis.textContent = post.analysis;
    card.append(analysis);
    appendComments(supabase, card, post, currentUser);
    postsList.append(card);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  authPanel.hidden = true;
  showStatus(
    "Cộng đồng chưa được cấu hình. Hãy chạy bash scripts/setup-local.sh để nhập cấu hình Supabase vào máy này.",
    true,
  );
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let currentUser = null;
  let currentProfile = null;

  async function invokeCommunity(action, payload) {
    const { data, error } = await supabase.functions.invoke("community-api", {
      body: { action, ...payload },
    });

    if (!error) return data;

    let responseBody = null;
    if (error.context instanceof Response) {
      try {
        responseBody = await error.context.clone().json();
      } catch {
        responseBody = null;
      }
    }

    if (responseBody?.message) {
      throw new Error(responseBody.message);
    }

    const messages = {
      moderation_rejected: "Nội dung chưa phù hợp để đăng.",
      moderation_rate_limited:
        "Cộng đồng đang gửi nhiều yêu cầu kiểm duyệt. Vui lòng thử lại sau một phút.",
      moderation_unavailable:
        "AI kiểm duyệt hiện không khả dụng. Bài chưa được lưu; vui lòng thử lại sau.",
      database_unavailable: "Không thể lưu dữ liệu lúc này. Vui lòng thử lại.",
      post_not_found: "Bài viết này không còn tồn tại.",
      unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
    const code = responseBody?.error;
    throw new Error(
      messages[code] ||
        (error.message.includes("Failed to fetch")
          ? "Không thể kết nối dịch vụ cộng đồng. Vui lòng thử lại sau."
          : error.message),
    );
  }

  function validateImage(file) {
    if (!file) return;
    if (!IMAGE_EXTENSIONS.has(file.type)) {
      throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Ảnh vượt quá giới hạn 5 MB.");
    }
  }

  async function uploadImage(file, userId, folder) {
    if (!file) return null;
    validateImage(file);
    const extension = IMAGE_EXTENSIONS.get(file.type);
    const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(`Không thể tải ảnh lên: ${error.message}`);
    return path;
  }

  async function removeUploadedImage(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) {
      console.error("Could not remove an unreferenced community image.", {
        path,
        message: error.message,
      });
    }
  }

  async function loadProfile() {
    if (!currentUser) {
      currentProfile = null;
      avatarPreview.hidden = true;
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (error) throw error;

    currentProfile = data;
    profileNameInput.value = data?.display_name || "";
    avatarPreview.hidden = !data?.avatar_path;
    if (data?.avatar_path) {
      avatarPreview.src = publicImageUrl(supabase, data.avatar_path);
    } else {
      avatarPreview.removeAttribute("src");
    }
  }

  async function loadPosts() {
    showStatus("Đang tải bài đăng...");
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        "id, author_id, title, literary_work, analysis, image_path, created_at, profiles(display_name, avatar_path)",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      showStatus(`Không thể tải bài đăng: ${postsError.message}`, true);
      return;
    }

    let comments = [];
    if (posts.length) {
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          "id, post_id, author_id, content, created_at, profiles(display_name, avatar_path)",
        )
        .in("post_id", posts.map((post) => post.id))
        .order("created_at", { ascending: true });

      if (error) {
        showStatus(`Không thể tải bình luận: ${error.message}`, true);
        return;
      }
      comments = data;
    }

    const commentsByPostId = new Map();
    for (const comment of comments) {
      const postComments = commentsByPostId.get(comment.post_id) || [];
      postComments.push(comment);
      commentsByPostId.set(comment.post_id, postComments);
    }
    renderPosts(
      supabase,
      posts.map((post) => ({
        ...post,
        post_comments: commentsByPostId.get(post.id) || [],
      })),
      currentUser,
    );
    showStatus(posts.length ? `Đang hiển thị ${posts.length} bài đăng gần nhất.` : "");
  }

  function updateAccount(session) {
    currentUser = session?.user || null;
    const signedIn = Boolean(currentUser);
    authPanel.hidden = signedIn;
    accountPanel.hidden = !signedIn;
    postPanel.hidden = !signedIn;
    if (signedIn) {
      document.getElementById("account-email").textContent =
        currentUser.email || "";
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(signInButton, true, "Đang đăng nhập...");
    try {
      const formData = new FormData(authForm);
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.get("email").trim(),
        password: formData.get("password"),
      });
      if (error) throw error;
      authForm.reset();
      showStatus("Đăng nhập thành công.");
    } catch (error) {
      showStatus(`Không thể đăng nhập: ${error.message}`, true);
    } finally {
      setBusy(signInButton, false);
    }
  }

  async function signUp() {
    if (!authForm.reportValidity()) return;

    setBusy(signUpButton, true, "Đang tạo tài khoản...");
    try {
      const formData = new FormData(authForm);
      if (formData.get("password").length < 8) {
        throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
      }
      const { data, error } = await supabase.auth.signUp({
        email: formData.get("email").trim(),
        password: formData.get("password"),
      });
      if (error) throw error;
      authForm.reset();
      showStatus(
        data.session
          ? "Tạo tài khoản thành công."
          : "Đã tạo tài khoản. Hãy xác nhận email để đăng nhập.",
      );
    } catch (error) {
      showStatus(`Không thể tạo tài khoản: ${error.message}`, true);
    } finally {
      setBusy(signUpButton, false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(saveProfileButton, true, "Đang kiểm duyệt...");
    let uploadedPath = null;
    try {
      const displayName = profileNameInput.value.trim();
      if (!displayName || displayName.length > 80) {
        throw new Error("Tên hiển thị phải có từ 1 đến 80 ký tự.");
      }

      const file = avatarFileInput.files[0];
      uploadedPath = await uploadImage(file, currentUser.id, "avatars");
      const avatarPath = uploadedPath || currentProfile?.avatar_path || null;
      await invokeCommunity("update-profile", {
        display_name: displayName,
        avatar_path: avatarPath,
      });

      const previousAvatarPath = currentProfile?.avatar_path;
      currentProfile = { display_name: displayName, avatar_path: avatarPath };
      avatarFileInput.value = "";
      avatarPreview.hidden = !avatarPath;
      if (avatarPath) avatarPreview.src = publicImageUrl(supabase, avatarPath);
      if (uploadedPath && previousAvatarPath) {
        await removeUploadedImage(previousAvatarPath);
      }
      showStatus("Đã lưu hồ sơ sau khi kiểm duyệt.");
      await loadPosts();
    } catch (error) {
      await removeUploadedImage(uploadedPath);
      showStatus(`Không thể lưu hồ sơ: ${error.message}`, true);
    } finally {
      setBusy(saveProfileButton, false);
    }
  }

  async function publishPost(event) {
    event.preventDefault();
    setBusy(publishButton, true, "Đang tải ảnh và kiểm duyệt...");
    let uploadedPath = null;
    try {
      const formData = new FormData(postForm);
      const title = formData.get("title").trim();
      const literaryWork = formData.get("literary_work").trim();
      const analysis = formData.get("analysis").trim();
      const file = formData.get("image");

      uploadedPath = await uploadImage(file, currentUser.id, "posts");
      await invokeCommunity("create-post", {
        title,
        literary_work: literaryWork,
        analysis,
        image_path: uploadedPath,
      });

      postForm.reset();
      showStatus("Bài viết đã qua kiểm duyệt và được đăng.");
      await loadPosts();
    } catch (error) {
      await removeUploadedImage(uploadedPath);
      showStatus(`Bài viết chưa được đăng: ${error.message}`, true);
    } finally {
      setBusy(publishButton, false);
    }
  }

  async function submitComment(event, form, button, postId) {
    event.preventDefault();
    setBusy(button, true, "Đang kiểm duyệt...");
    try {
      const content = new FormData(form).get("content").trim();
      await invokeCommunity("create-comment", { post_id: postId, content });
      showStatus("Bình luận đã qua kiểm duyệt và được đăng.");
      await loadPosts();
    } catch (error) {
      showStatus(`Bình luận chưa được đăng: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  document.getElementById("refresh-button").addEventListener("click", loadPosts);
  document.getElementById("sign-out-button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showStatus(`Không thể đăng xuất: ${error.message}`, true);
  });
  authForm.addEventListener("submit", signIn);
  signUpButton.addEventListener("click", signUp);
  profileForm.addEventListener("submit", saveProfile);
  postForm.addEventListener("submit", publishPost);

  supabase.auth.onAuthStateChange((_event, session) => {
    updateAccount(session);
    queueMicrotask(() => {
      void loadProfile()
        .then(loadPosts)
        .catch((error) =>
          showStatus(`Không thể tải hồ sơ: ${error.message}`, true),
        );
    });
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    showStatus(`Không thể kiểm tra phiên đăng nhập: ${sessionError.message}`, true);
  } else {
    updateAccount(sessionData.session);
    if (sessionData.session) {
      try {
        await loadProfile();
      } catch (error) {
        showStatus(`Không thể tải hồ sơ: ${error.message}`, true);
      }
    }
    await loadPosts();
  }
}
