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
const moderationPanel = document.getElementById("moderation-panel");
const ownerPanel = document.getElementById("owner-panel");
const authForm = document.getElementById("auth-form");
const profileForm = document.getElementById("profile-form");
const postForm = document.getElementById("post-form");
const moderatorForm = document.getElementById("moderator-form");
const announcementForm = document.getElementById("announcement-form");
const statusMessage = document.getElementById("status-message");
const postsList = document.getElementById("posts-list");
const moderationPosts = document.getElementById("moderation-posts");
const banProposals = document.getElementById("ban-proposals");
const moderatorList = document.getElementById("moderator-list");
const announcementList = document.getElementById("announcement-list");
const signInButton = document.getElementById("sign-in-button");
const signUpButton = document.getElementById("sign-up-button");
const saveProfileButton = document.getElementById("save-profile-button");
const publishButton = document.getElementById("publish-button");
const profileNameInput = document.getElementById("display-name");
const avatarFileInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");
const accountRole = document.getElementById("account-role");
const accountPermissions = document.getElementById("account-permissions");

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

function appendComments(
  supabase,
  card,
  post,
  currentUser,
  commentAccess,
  commentsUnavailable,
) {
  const commentSection = document.createElement("section");
  commentSection.className = "post-comments";
  const heading = document.createElement("h4");
  heading.textContent = commentsUnavailable
    ? "Bình luận chưa tải được"
    : `Bình luận (${post.post_comments.length})`;
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
  if (commentsUnavailable) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Vui lòng tải lại trang để xem các bình luận.";
    commentSection.append(note);
  }

  if (commentAccess === "allowed" && currentUser) {
    const form = document.createElement("form");
    form.className = "comment-form";
    const input = document.createElement("textarea");
    input.name = "content";
    input.required = true;
    input.maxLength = 2000;
    input.rows = 2;
    input.setAttribute("aria-label", "Nội dung bình luận");
    input.placeholder = "Chia sẻ suy nghĩ của bạn về bài viết...";
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Gửi bình luận";
    form.append(input, button);
    form.addEventListener("submit", (event) => {
      void submitComment(event, form, button, post.id);
    });
    commentSection.append(form);
  } else if (commentAccess === "signed-out") {
    const signInNote = document.createElement("p");
    signInNote.className = "muted";
    const link = document.createElement("a");
    link.href = "#community-account";
    link.textContent = "Đăng nhập";
    signInNote.append(link, document.createTextNode(" để viết bình luận."));
    commentSection.append(signInNote);
  } else if (commentAccess === "unverified") {
    const unavailableNote = document.createElement("p");
    unavailableNote.className = "muted";
    unavailableNote.textContent =
      "Chưa thể xác nhận quyền tài khoản. Hãy tải lại trang hoặc đăng nhập lại để bình luận.";
    commentSection.append(unavailableNote);
  } else if (commentAccess === "banned") {
    const unavailableNote = document.createElement("p");
    unavailableNote.className = "muted";
    unavailableNote.textContent =
      "Tài khoản đang bị hạn chế nên hiện không thể bình luận.";
    commentSection.append(unavailableNote);
  }
  card.append(commentSection);
}

function addBanRequestForm(container, targetUserId, onBan) {
  const form = document.createElement("form");
  form.className = "moderation-actions";

  const reasonLabel = document.createElement("label");
  reasonLabel.textContent = "Lý do BAN";
  const reason = document.createElement("input");
  reason.required = true;
  reason.maxLength = 1000;
  reasonLabel.append(reason);

  const durationLabel = document.createElement("label");
  durationLabel.textContent = "Thời hạn";
  const duration = document.createElement("select");
  for (const [value, label] of [
    ["24", "24 giờ"],
    ["168", "7 ngày"],
    ["720", "30 ngày"],
    ["2160", "90 ngày"],
    ["permanent", "Vĩnh viễn"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    duration.append(option);
  }
  durationLabel.append(duration);

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Đề xuất BAN";
  button.dataset.danger = "true";
  form.append(reasonLabel, durationLabel, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void onBan({
      target_user_id: targetUserId,
      reason: reason.value.trim(),
      duration_hours: duration.value === "permanent"
        ? null
        : Number(duration.value),
    });
  });
  container.append(form);
}

function renderPosts(
  supabase,
  posts,
  currentUser,
  currentRole,
  onBan,
  currentUserIsBanned,
  canComment,
  commentsUnavailable,
) {
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
    if (
      currentUser &&
      !currentUserIsBanned &&
      currentUser.id !== post.author_id &&
      (currentRole === "moderator" || currentRole === "owner")
    ) {
      addBanRequestForm(card, post.author_id, onBan);
    }

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
    const commentAccess = !currentUser
      ? "signed-out"
      : currentUserIsBanned
        ? "banned"
        : canComment
          ? "allowed"
          : "unverified";
    appendComments(
      supabase,
      card,
      post,
      currentUser,
      commentAccess,
      commentsUnavailable,
    );
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
  let currentRole = null;
  let currentUserIsBanned = false;
  let authRevision = 0;

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
      database_unavailable: "Dịch vụ lưu trữ tạm thời không khả dụng.",
      post_not_found: "Bài viết này không còn tồn tại.",
      invalid_comment: "Bình luận không được để trống và tối đa 2.000 ký tự.",
      unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      account_banned: "Tài khoản đang bị cấm và không thể sử dụng cộng đồng.",
      server_not_configured: "Dịch vụ cộng đồng chưa được cấu hình đầy đủ.",
      role_not_configured: "Tài khoản chưa được thiết lập quyền cộng đồng.",
      forbidden: "Tài khoản không có quyền thực hiện thao tác này.",
      user_not_found: "Không tìm thấy tài khoản đã đăng ký.",
      user_email_not_confirmed: "Tài khoản cần xác nhận email trước khi phân quyền.",
      ban_saved_auth_lock_failed:
        "Đã lưu lệnh cấm nhưng Supabase Auth chưa thể khóa phiên đăng nhập.",
      ban_decision_rejected:
        "Không thể duyệt đề xuất này. Có thể Moderator khác đã xử lý trước.",
      ban_already_pending_or_active:
        "Tài khoản đã có lệnh cấm hoặc đề xuất đang chờ duyệt.",
      pending_proposal_not_found: "Đề xuất không còn chờ xử lý.",
      cannot_approve_own_proposal: "Bạn không thể tự duyệt đề xuất BAN của mình.",
      role_change_rejected: "Không thể thay đổi quyền của tài khoản này.",
      post_moderation_rejected: "Không thể thay đổi trạng thái bài viết.",
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
      return { postsLoaded: false, commentsError: null };
    }

    let comments = [];
    let commentsError = null;
    if (posts.length) {
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          "id, post_id, author_id, content, created_at, profiles(display_name, avatar_path)",
        )
        .in("post_id", posts.map((post) => post.id))
        .order("created_at", { ascending: true });

      commentsError = error;
      comments = data || [];
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
      currentRole,
      requestBan,
      currentUserIsBanned,
      Boolean(currentRole) && !currentUserIsBanned,
      Boolean(commentsError),
    );
    if (commentsError) {
      showStatus(
        `Bài đăng đã tải, nhưng chưa thể tải bình luận: ${commentsError.message}`,
        true,
      );
    } else {
      showStatus(
        posts.length ? `Đang hiển thị ${posts.length} bài đăng gần nhất.` : "",
      );
    }
    return { postsLoaded: true, commentsError };
  }

  async function loadModerationData() {
    if (currentRole !== "moderator" && currentRole !== "owner") return;
    const data = await invokeCommunity("get-moderation-data", {});
    moderationPosts.replaceChildren();
    banProposals.replaceChildren();

    if (!data.posts.length) {
      moderationPosts.textContent = "Chưa có bài viết cần xem.";
    }
    for (const post of data.posts) {
      const item = document.createElement("article");
      item.className = "moderation-item";
      const title = document.createElement("h4");
      title.textContent = post.title;
      const author = document.createElement("p");
      author.textContent =
        `Tác giả: ${post.profiles?.display_name || "Thành viên"} · ` +
        `trạng thái: ${post.status}`;
      const preview = document.createElement("p");
      preview.textContent = post.analysis.slice(0, 360);
      const actions = document.createElement("div");
      actions.className = "moderation-actions";
      const reason = document.createElement("input");
      reason.maxLength = 1000;
      reason.setAttribute("aria-label", "Lý do kiểm duyệt bài viết");
      reason.placeholder = "Lý do (không bắt buộc)";
      const status = post.status === "approved" ? "rejected" : "approved";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = status === "rejected" ? "Ẩn bài" : "Khôi phục bài";
      button.dataset.danger = String(status === "rejected");
      button.addEventListener("click", async () => {
        try {
          await invokeCommunity("moderate-post", {
            post_id: post.id,
            status,
            reason: reason.value.trim(),
          });
          showStatus(status === "rejected" ? "Đã ẩn bài viết." : "Đã khôi phục bài viết.");
          await loadPosts();
          await loadModerationData();
        } catch (error) {
          showStatus(`Không thể kiểm duyệt bài: ${error.message}`, true);
        }
      });
      actions.append(reason, button);
      item.append(title, author, preview, actions);
      moderationPosts.append(item);
    }

    if (!data.proposals.length) {
      banProposals.textContent = "Không có đề xuất BAN đang chờ.";
    }
    for (const proposal of data.proposals) {
      const item = document.createElement("article");
      item.className = "moderation-item";
      const title = document.createElement("h4");
      title.textContent = `Đề xuất BAN · tài khoản …${proposal.target_user_id.slice(-8)}`;
      const details = document.createElement("p");
      details.textContent =
        `${proposal.reason} · ` +
        (proposal.duration_hours === null
          ? "vĩnh viễn"
          : `${proposal.duration_hours} giờ`) +
        ` · đề xuất bởi …${proposal.requested_by.slice(-8)}`;
      const actions = document.createElement("div");
      actions.className = "moderation-actions";
      const decisionReason = document.createElement("input");
      decisionReason.maxLength = 1000;
      decisionReason.setAttribute("aria-label", "Lý do quyết định BAN");
      decisionReason.placeholder = "Ghi chú (không bắt buộc)";
      for (const approve of [true, false]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = approve ? "Duyệt BAN" : "Từ chối";
        button.dataset.danger = String(approve);
        button.addEventListener("click", async () => {
          try {
            await invokeCommunity("resolve-ban", {
              proposal_id: proposal.id,
              approve,
              decision_reason: decisionReason.value.trim(),
            });
            showStatus(approve ? "Đã duyệt lệnh BAN." : "Đã từ chối đề xuất.");
            await loadModerationData();
          } catch (error) {
            showStatus(`Không thể xử lý đề xuất: ${error.message}`, true);
          }
        });
        actions.append(button);
      }
      item.append(title, details, decisionReason, actions);
      banProposals.append(item);
    }

    if (currentRole !== "owner") return;

    moderatorList.replaceChildren();
    if (!data.moderators.length) {
      moderatorList.textContent = "Chưa có Moderator nào.";
    }
    for (const moderator of data.moderators) {
      const item = document.createElement("article");
      item.className = "moderation-item";
      item.textContent = moderator.email || "Tài khoản Moderator";
      moderatorList.append(item);
    }

    announcementList.replaceChildren();
    if (!data.announcements.length) {
      announcementList.textContent = "Chưa có thông báo.";
    }
    for (const announcement of data.announcements) {
      const item = document.createElement("article");
      item.className = "moderation-item";
      const title = document.createElement("h4");
      title.textContent = announcement.title;
      const body = document.createElement("p");
      body.textContent = announcement.body;
      const status = document.createElement("p");
      status.textContent = announcement.is_active ? "Đang hiển thị" : "Đã lưu trữ";
      item.append(title, body, status);
      if (announcement.is_active) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Gỡ thông báo";
        button.dataset.danger = "true";
        button.addEventListener("click", async () => {
          try {
            await invokeCommunity("archive-announcement", {
              announcement_id: announcement.id,
            });
            showStatus("Đã gỡ thông báo khỏi trang chủ.");
            await loadModerationData();
          } catch (error) {
            showStatus(`Không thể gỡ thông báo: ${error.message}`, true);
          }
        });
        item.append(button);
      }
      announcementList.append(item);
    }
  }

  async function requestBan(payload) {
    try {
      const result = await invokeCommunity("request-ban", payload);
      showStatus(
        result.status === "pending"
          ? "Đã gửi đề xuất BAN, cần Moderator khác xác nhận."
          : "Đã cấm tài khoản.",
      );
      await loadModerationData();
    } catch (error) {
      showStatus(`Không thể cấm tài khoản: ${error.message}`, true);
    }
  }

  function updateAccount(session) {
    currentUser = session?.user || null;
    const signedIn = Boolean(currentUser);
    authPanel.hidden = signedIn;
    accountPanel.hidden = !signedIn;
    postPanel.hidden = !signedIn || !currentRole || currentUserIsBanned;
    profileForm.hidden = !signedIn || !currentRole || currentUserIsBanned;
    moderationPanel.hidden =
      !signedIn ||
      currentUserIsBanned ||
      (currentRole !== "moderator" && currentRole !== "owner");
    ownerPanel.hidden = !signedIn || currentUserIsBanned || currentRole !== "owner";
    const banNotice = document.getElementById("account-ban-notice");
    avatarPreview.hidden = true;
    banNotice.hidden = !currentUserIsBanned;
    banNotice.textContent = currentUserIsBanned
      ? "Tài khoản đang bị cấm; các chức năng cộng đồng đã bị khóa."
      : "";
    const roleDetails = {
      users: {
        label: "Thành viên",
        permissions: "Có thể đăng bài và bình luận sau khi đăng nhập.",
      },
      moderator: {
        label: "Moderator",
        permissions:
          "Có thể kiểm duyệt bài viết và đề xuất BAN; cần Moderator khác duyệt lệnh BAN.",
      },
      owner: {
        label: "Owner",
        permissions:
          "Có thể quản lý Moderator, kiểm duyệt, BAN trực tiếp và đăng thông báo.",
      },
    }[currentRole];
    accountRole.hidden = !signedIn || !roleDetails;
    accountPermissions.hidden = !signedIn || !roleDetails;
    if (roleDetails) {
      accountRole.textContent = roleDetails.label;
      accountRole.dataset.role = currentRole;
      accountPermissions.textContent = currentUserIsBanned
        ? "Tài khoản đang bị cấm; quyền cộng đồng tạm khóa."
        : roleDetails.permissions;
    }
    if (signedIn) {
      document.getElementById("account-email").textContent =
        currentUser.email || "";
    }
  }

  async function handleSession(session) {
    const revision = ++authRevision;
    currentRole = null;
    currentUserIsBanned = false;
    updateAccount(session);
    if (!session) {
      currentProfile = null;
      await loadPosts();
      return;
    }

    let access;
    try {
      access = await invokeCommunity("get-access", {});
    } catch (error) {
      if (revision !== authRevision) return;
      currentRole = null;
      currentUserIsBanned = false;
      updateAccount(session);
      await loadPosts();
      showStatus(`Không thể xác thực quyền tài khoản: ${error.message}`, true);
      return;
    }

    if (revision !== authRevision) return;
    currentRole = access.role;
    currentUserIsBanned = access.banned;
    updateAccount(session);
    let accessStatus = "";
    let profileStatus = "";
    if (currentUserIsBanned) {
      accessStatus = access.ban_expires_at
        ? `Tài khoản đang bị cấm đến ${formatDate(access.ban_expires_at)}.`
        : "Tài khoản đang bị cấm vĩnh viễn.";
    } else {
      try {
        await loadProfile();
      } catch (error) {
        profileStatus = `Không thể tải hồ sơ: ${error.message}`;
      }
    }

    await loadPosts();
    if (accessStatus) showStatus(accessStatus, true);
    else if (profileStatus) showStatus(profileStatus, true);
    if (
      !currentUserIsBanned &&
      (currentRole === "moderator" || currentRole === "owner")
    ) {
      try {
        await loadModerationData();
      } catch (error) {
        showStatus(`Không thể tải công cụ kiểm duyệt: ${error.message}`, true);
      }
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
      if (!content) {
        throw new Error("Bình luận không được để trống.");
      }
      await invokeCommunity("create-comment", { post_id: postId, content });
      form.reset();
      const refreshResult = await loadPosts();
      if (refreshResult?.postsLoaded && !refreshResult.commentsError) {
        showStatus("Bình luận đã qua kiểm duyệt và được đăng.");
      } else {
        showStatus(
          "Bình luận đã được gửi, nhưng danh sách chưa thể làm mới. Hãy bấm Tải lại.",
          true,
        );
      }
    } catch (error) {
      showStatus(`Bình luận chưa được đăng: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  async function setModeratorRole(makeModerator) {
    const emailInput = moderatorForm.elements.namedItem("email");
    const email = emailInput.value.trim();
    if (!email || !moderatorForm.reportValidity()) return;
    try {
      await invokeCommunity("manage-moderator", {
        email,
        make_moderator: makeModerator,
      });
      moderatorForm.reset();
      showStatus(makeModerator ? "Đã thêm Moderator." : "Đã gỡ quyền Moderator.");
      await loadModerationData();
    } catch (error) {
      showStatus(`Không thể thay đổi Moderator: ${error.message}`, true);
    }
  }

  async function publishAnnouncement(event) {
    event.preventDefault();
    try {
      const formData = new FormData(announcementForm);
      const endsAtValue = formData.get("ends_at");
      const endsAt = endsAtValue ? new Date(endsAtValue).toISOString() : null;
      await invokeCommunity("publish-announcement", {
        title: formData.get("title").trim(),
        body: formData.get("body").trim(),
        ends_at: endsAt,
      });
      announcementForm.reset();
      showStatus("Đã đăng thông báo trên trang chủ.");
      await loadModerationData();
    } catch (error) {
      showStatus(`Không thể đăng thông báo: ${error.message}`, true);
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
  moderatorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void setModeratorRole(true);
  });
  document.getElementById("remove-moderator-button")
    .addEventListener("click", () => void setModeratorRole(false));
  announcementForm.addEventListener("submit", publishAnnouncement);

  supabase.auth.onAuthStateChange((_event, session) => {
    queueMicrotask(() => void handleSession(session));
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    showStatus(`Không thể kiểm tra phiên đăng nhập: ${sessionError.message}`, true);
  } else {
    await handleSession(sessionData.session);
  }
}
