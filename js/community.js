import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const MEDIA_BUCKET = "community-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SIGNED_IMAGE_TTL_SECONDS = 24 * 60 * 60;
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
const postTitleInput = document.getElementById("post-title-input");
const profileNameInput = document.getElementById("display-name");
const avatarFileInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");
const postImageInput = document.getElementById("post-image");
const postImagePreview = document.getElementById("post-image-preview");
const accountRole = document.getElementById("account-role");
const accountPermissions = document.getElementById("account-permissions");
const accountContent = document.getElementById("account-content");
const accountContentList = document.getElementById("account-content-list");
const accountNotifications = document.getElementById("account-notifications");
const notificationList = document.getElementById("notification-list");
const publicProfileView = document.getElementById("public-profile-view");
const publicProfileAvatar = document.getElementById("public-profile-avatar");
const publicProfileName = document.getElementById("public-profile-name");
const openPostButton = document.getElementById("open-post-button");
const closePostButton = document.getElementById("close-post-button");
const imageRatioInput = document.getElementById("image-ratio");
const mentionSearchInput = document.getElementById("mention-search");
const mentionResults = document.getElementById("mention-results");
const selectedMentions = document.getElementById("selected-mentions");
const featuredPosts = document.getElementById("featured-posts");
const activeTagFilter = document.getElementById("active-tag-filter");
const imageUrlCache = new Map();
const selectedMentionUsers = new Map();
let mentionSearchTimer = null;
let mentionSearchRevision = 0;
let composerOpen = false;

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function userError(message) {
  const error = new Error(message);
  error.name = "CommunityUserError";
  return error;
}

function showFailure(error, operation, guidance) {
  console.error(`[Cộng đồng] ${operation}`, {
    code: error?.code || error?.name || "unknown",
    status: error?.status,
    message: error?.message || String(error),
  });
  if (error?.name === "CommunityUserError") {
    showStatus(error.message, true);
    return;
  }

  const code = error?.code;
  const message = code === "42P01" || String(code || "").startsWith("PGRST")
    ? "Dữ liệu cộng đồng chưa được cập nhật. Vui lòng báo quản trị viên."
    : code === "invalid_credentials"
      ? "Email hoặc mật khẩu chưa chính xác. Hãy kiểm tra rồi thử lại."
      : code === "email_not_confirmed"
        ? "Bạn cần xác nhận email trong hộp thư trước khi đăng nhập."
        : "Chưa thể hoàn tất thao tác. " + guidance;
  showStatus(message, true);
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

function normalizeImagePaths(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim());
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim());
      }
    } catch {
      return [trimmed];
    }
    return [trimmed];
  }
  return [];
}

const MAX_POST_IMAGES = 10;

function updateCharacterCount(inputId, counterId) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  counter.textContent = `${input.value.length}/${input.maxLength}`;
}

let selectedImageObjectUrls = [];

function renderPostImagePreview() {
  selectedImageObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  selectedImageObjectUrls = [];
  postImagePreview.replaceChildren();

  const files = Array.from(postImageInput.files || []).filter((file) => file.size > 0);
  if (!files.length) {
    postImagePreview.hidden = true;
    return;
  }

  postImagePreview.hidden = false;
  const message = document.createElement("p");
  message.className = "image-selection-message";
  const oversizedImage = files.find((file) => file.size > MAX_IMAGE_BYTES);
  if (files.length > MAX_POST_IMAGES) {
    message.textContent = `Đã chọn ${files.length} ảnh. Hãy chọn tối đa ${MAX_POST_IMAGES} ảnh.`;
    message.dataset.error = "true";
  } else if (oversizedImage) {
    message.textContent = `Ảnh “${oversizedImage.name}” vượt quá giới hạn 5 MB.`;
    message.dataset.error = "true";
  } else {
    message.textContent = `${files.length} ảnh đã chọn · ảnh đầu tiên sẽ làm ảnh bìa.`;
  }
  postImagePreview.append(message);

  files.slice(0, MAX_POST_IMAGES).forEach((file, index) => {
    const url = URL.createObjectURL(file);
    selectedImageObjectUrls.push(url);
    const figure = document.createElement("figure");
    figure.className = "image-selection-item";
    const image = document.createElement("img");
    image.src = url;
    image.alt = `Ảnh ${index + 1} đã chọn`;
    image.dataset.ratio = imageRatioInput.value;
    if (imageRatioInput.value !== "natural") {
      image.style.height = "auto";
      image.style.aspectRatio = {
        square: "1 / 1",
        landscape: "4 / 3",
        portrait: "3 / 4",
      }[imageRatioInput.value];
      image.style.objectFit = "cover";
    }
    const caption = document.createElement("figcaption");
    caption.textContent = index === 0 ? "Ảnh bìa" : `Ảnh ${index + 1}`;
    figure.append(image, caption);
    postImagePreview.append(figure);
  });
}

document.getElementById("post-title-input").addEventListener("input", () => {
  updateCharacterCount("post-title-input", "post-title-count");
});
document.getElementById("post-analysis").addEventListener("input", () => {
  updateCharacterCount("post-analysis", "post-analysis-count");
});
postImageInput.addEventListener("change", renderPostImagePreview);
imageRatioInput.addEventListener("change", renderPostImagePreview);

async function signedImageUrl(supabase, path) {
  if (!path) return "";
  const cached = imageUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_IMAGE_TTL_SECONDS);
  if (error) {
    console.error("[Cộng đồng] Không thể tạo liên kết ảnh an toàn.", {
      code: error.name,
      message: error.message,
    });
    throw error;
  }
  const url = data.signedUrl;
  imageUrlCache.set(path, {
    url,
    expiresAt: Date.now() + (SIGNED_IMAGE_TTL_SECONDS - 60) * 1000,
  });
  return url;
}

function makeAvatar(profile, className = "post-avatar") {
  const image = document.createElement("img");
  image.className = className;
  image.alt = "";
  image.loading = "lazy";
  image.hidden = !profile?.avatar_url;
  if (profile?.avatar_url) image.src = profile.avatar_url;
  return image;
}

function appendComments(
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
    : `Bình luận (${post.post_comments.length + (post.pending_comments?.length || 0)})`;
  commentSection.append(heading);

  const commentList = document.createElement("div");
  commentList.className = "comment-list";
  for (const comment of post.post_comments) {
    const commentItem = document.createElement("article");
    commentItem.className = "comment-item";
    const avatar = makeAvatar(comment.profiles);
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
  for (const comment of post.pending_comments || []) {
    const commentItem = document.createElement("article");
    commentItem.className = "comment-item pending-comment";
    const pending = document.createElement("p");
    pending.className = "muted";
    pending.textContent = `Bình luận của bạn đang chờ AI kiểm duyệt · ${formatDate(comment.created_at)}`;
    const content = document.createElement("p");
    content.className = "comment-content";
    content.textContent = comment.content;
    commentItem.append(pending, content);
    commentList.append(commentItem);
  }
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
  posts,
  currentUser,
  currentRole,
  onBan,
  currentUserIsBanned,
  canComment,
  commentsUnavailable,
  likeData = new Map(),
  postMetadata = new Map(),
) {
  postsList.replaceChildren();
  featuredPosts.replaceChildren();
  featuredPosts.hidden = true;
  const featuredEntries = [];

  if (!posts.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = new URLSearchParams(location.search).has("profile")
      ? "Hồ sơ này chưa có bài viết nào được duyệt."
      : "Chưa có bài đăng nào. Hãy chia sẻ điều đầu tiên!";
    postsList.append(emptyState);
    return;
  }

  for (const post of posts) {
    const metadata = postMetadata.get(post.id) || {
      author_role: "users",
      likes_count: 0,
      comments_count: post.post_comments?.length || 0,
      shares_count: 0,
      is_pinned: false,
    };
    const card = document.createElement("article");
    card.className = "post-card";
    const authorRow = document.createElement("div");
    authorRow.className = "post-author";
    authorRow.append(makeAvatar(post.profiles));
    const meta = document.createElement("p");
    meta.className = "post-meta";
    const profileLink = document.createElement("a");
    profileLink.href = `?profile=${encodeURIComponent(post.author_id)}#community-feed`;
    profileLink.textContent = post.profiles?.display_name || "Thành viên";
    const metaText = document.createTextNode(` · ${formatDate(post.created_at)}`);
    const roleBadge = document.createElement("span");
    roleBadge.className = `post-role post-role-${metadata.author_role}`;
    roleBadge.textContent = {
      owner: "Owner",
      moderator: "Moderator",
      users: "Member",
    }[metadata.author_role] || "Member";
    meta.append(profileLink, metaText, document.createTextNode(" "), roleBadge);
    authorRow.append(meta);
    if (metadata.is_pinned) {
      const pinned = document.createElement("span");
      pinned.className = "pinned-badge";
      pinned.textContent = "Được ghim";
      authorRow.append(pinned);
    }
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
    if (post.location_tags?.length) {
      const tags = document.createElement("div");
      tags.className = "post-tags";
      for (const tag of post.location_tags) {
        const tagLink = document.createElement("a");
        tagLink.href = `?tag=${encodeURIComponent(tag)}#community-feed`;
        tagLink.textContent = tag;
        tags.append(tagLink);
      }
      card.append(tags);
    }

    const mediaUrls = normalizeImagePaths(post.image_paths ?? post.image_path)
      .map((imagePath) => post.image_urls?.get?.(imagePath) || post.image_url || "")
      .filter(Boolean);
    if (mediaUrls.length) {
      const gallery = document.createElement("div");
      gallery.className = "post-gallery";
      for (const imageUrl of mediaUrls) {
        const image = document.createElement("img");
        image.className = "post-image";
        image.src = imageUrl;
        image.alt = `Ảnh minh họa cho ${post.title}`;
        image.loading = "lazy";
        image.dataset.ratio = post.image_ratio || "natural";
        image.style.height = "auto";
        const aspectRatio = {
          square: "1 / 1",
          landscape: "4 / 3",
          portrait: "3 / 4",
        }[post.image_ratio];
        if (aspectRatio) image.style.aspectRatio = aspectRatio;
        else image.style.objectFit = "contain";
        gallery.append(image);
      }
      card.append(gallery);
    }

    const analysis = document.createElement("p");
    analysis.className = "post-analysis";
    analysis.textContent = post.analysis;
    card.id = `post-${post.id}`;
    card.append(analysis);
    const actions = document.createElement("div");
    actions.className = "post-actions";
    const like = document.createElement("button");
    like.type = "button";
    like.className = "button-secondary post-like";
    const likeInfo = likeData.get(post.id) || { likes_count: metadata.likes_count, liked_by_me: false };
    like.textContent = `${likeInfo.liked_by_me ? "♥" : "♡"} ${likeInfo.likes_count}`;
    like.setAttribute("aria-label", `${likeInfo.likes_count} lượt thích`);
    like.disabled = !currentUser || currentUserIsBanned;
    like.title = currentUser
      ? "Thích hoặc bỏ thích bài viết"
      : "Đăng nhập để thích bài viết";
    like.addEventListener("click", async () => {
      try {
        await toggleLike(post.id, !likeInfo.liked_by_me);
      } catch (error) {
        showFailure(error, "Thay đổi lượt thích", "Hãy kiểm tra kết nối rồi thử lại.");
      }
    });
    const share = document.createElement("button");
    share.type = "button";
    share.className = "button-secondary";
    share.textContent = `Chia sẻ · ${metadata.shares_count}`;
    share.addEventListener("click", () => void sharePost(post));
    actions.append(like, share);
    if (currentUser && currentUser.id === post.author_id && !currentUserIsBanned) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button-secondary post-delete";
      remove.textContent = "Xóa bài của tôi";
      remove.addEventListener("click", () => void deletePost(post));
      actions.append(remove);
    }
    if (currentRole === "owner" && !currentUserIsBanned) {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "button-secondary";
      pin.textContent = metadata.is_pinned ? "Bỏ ghim" : "Ghim bài";
      pin.addEventListener("click", () => void setPostPinned(post.id, !metadata.is_pinned));
      actions.append(pin);
    }
    card.append(actions);
    const commentAccess = !currentUser
      ? "signed-out"
      : currentUserIsBanned
        ? "banned"
        : canComment
          ? "allowed"
          : "unverified";
    appendComments(
      card,
      post,
      currentUser,
      commentAccess,
      commentsUnavailable,
    );
    postsList.append(card);

    if (metadata.is_pinned || metadata.likes_count + metadata.comments_count * 2 + metadata.shares_count * 3 >= 5) {
      const featured = document.createElement("a");
      featured.className = "featured-post";
      featured.href = `?post=${encodeURIComponent(post.id)}#post-${encodeURIComponent(post.id)}`;
      const featuredTitle = document.createElement("strong");
      featuredTitle.textContent = metadata.is_pinned ? `📌 ${post.title}` : post.title;
      const featuredSummary = document.createElement("span");
      featuredSummary.textContent =
        `${metadata.likes_count} tim · ${metadata.comments_count} bình luận · ${metadata.shares_count} chia sẻ`;
      featured.append(featuredTitle, featuredSummary);
      featuredEntries.push({
        element: featured,
        pinned: metadata.is_pinned,
        score: metadata.likes_count + metadata.comments_count * 2 + metadata.shares_count * 3,
      });
    }
  }
  featuredEntries
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score)
    .slice(0, 5)
    .forEach((entry) => featuredPosts.append(entry.element));
  featuredPosts.hidden = featuredPosts.childElementCount === 0;
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  authPanel.hidden = true;
  document.getElementById("account-setup-note").hidden = false;
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
  let currentAccountContent = null;
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

    const messages = {
      moderation_rejected: "Nội dung chưa phù hợp để đăng.",
      moderation_rate_limited:
        "Hàng đợi đang xử lý nhiều nội dung. Bài của bạn vẫn được lưu; hãy thử lại sau một phút.",
      moderation_unavailable:
        "Nội dung đã được lưu riêng tư và đang chờ AI kiểm duyệt. Hãy thử tải lại sau ít phút.",
      database_unavailable: "Chưa thể lưu dữ liệu. Hãy kiểm tra kết nối rồi thử lại.",
      invalid_comment: "Bình luận không được để trống và tối đa 2.000 ký tự.",
      invalid_title: "Tiêu đề phải có từ 1 đến 120 ký tự.",
      invalid_literary_work: "Tác phẩm hoặc địa danh không được dài quá 180 ký tự.",
      invalid_analysis: "Nội dung phân tích cần từ 10 đến 5.000 ký tự.",
      invalid_queue_item: "Không tìm thấy nội dung cần kiểm duyệt. Hãy tải lại trang.",
      invalid_like_request: "Chưa thể cập nhật lượt thích. Hãy tải lại trang.",
      invalid_location_tags: "Hashtag địa danh chưa hợp lệ (tối đa 8 thẻ).",
      invalid_image_ratio: "Tỉ lệ ảnh đã chọn không hợp lệ.",
      invalid_mentions: "Không thể gắn thẻ tài khoản này. Hãy tải lại danh sách thành viên.",
      invalid_notifications: "Danh sách thông báo không hợp lệ.",
      post_pending_ai: "Bài viết đang chờ AI kiểm duyệt; chưa thể thay đổi trạng thái.",
      post_not_found: "Bài viết này không còn tồn tại.",
      invalid_display_name: "Tên hiển thị phải có từ 1 đến 80 ký tự.",
      unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      account_banned: "Tài khoản đang bị cấm và không thể sử dụng cộng đồng.",
      server_not_configured: "Dịch vụ cộng đồng chưa được cấu hình đầy đủ.",
      role_not_configured: "Tài khoản chưa được thiết lập quyền cộng đồng.",
      forbidden: "Tài khoản không có quyền thực hiện thao tác này.",
      user_not_found: "Không tìm thấy tài khoản đã đăng ký.",
      user_email_not_confirmed: "Tài khoản cần xác nhận email trước khi phân quyền.",
      user_already_exists: "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.",
      weak_password: "Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.",
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
    console.error("[Cộng đồng] Yêu cầu dịch vụ thất bại.", {
      action,
      status: error.context?.status,
      code: code || "unknown",
      message: responseBody?.message || error.message,
    });
    throw userError(
      messages[code] ||
        (error.message.includes("Failed to fetch")
          ? "Không thể kết nối dịch vụ cộng đồng. Hãy kiểm tra internet rồi thử lại."
          : "Dịch vụ cộng đồng chưa thể hoàn tất thao tác. Hãy thử lại sau."),
    );
  }

  function validateImage(file) {
    if (!file) return;
    if (!IMAGE_EXTENSIONS.has(file.type)) {
      throw userError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw userError("Ảnh vượt quá giới hạn 5 MB.");
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
    if (error) {
      console.error("[Cộng đồng] Tải ảnh lên thất bại.", {
        code: error.name,
        message: error.message,
      });
      throw userError("Chưa thể tải ảnh lên. Hãy kiểm tra định dạng, kích thước và kết nối.");
    }
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

  async function renderAccountContent(data) {
    accountContent.hidden = !currentUser || currentUserIsBanned;
    accountContentList.replaceChildren();
    const items = [
      ...(data.posts || []).map((post) => ({
        type: "post",
        id: post.id,
        title: post.title,
        content: post.analysis,
        literary_work: post.literary_work,
        image_path: post.image_path,
        created_at: post.created_at,
        status: post.status,
      })),
      ...(data.comments || []).map((comment) => ({
        type: "comment",
        id: comment.id,
        title: comment.posts?.title
          ? `Bình luận trong “${comment.posts.title}”`
          : "Bình luận",
        content: comment.content,
        post_id: comment.post_id,
        created_at: comment.created_at,
        status: comment.status,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Bạn chưa có bài viết hoặc bình luận nào.";
      accountContentList.append(empty);
      return;
    }

    for (const entry of items) {
      const item = document.createElement("article");
      item.className = "account-content-item";
      const heading = document.createElement("h4");
      heading.textContent = entry.title;
      const status = document.createElement("span");
      status.className = `content-status content-status-${entry.status}`;
      status.textContent = entry.status === "pending" ? "Đang chờ AI" : "Đã duyệt";
      const date = document.createElement("p");
      date.className = "muted";
      date.textContent = formatDate(entry.created_at);
      item.append(heading, status, date);
      if (entry.literary_work) {
        const work = document.createElement("p");
        work.className = "post-literary-work";
        work.textContent = entry.literary_work;
        item.append(work);
      }
      if (entry.content) {
        const content = document.createElement("p");
        content.className = "account-content-preview";
        content.textContent = entry.content;
        item.append(content);
      }
      const mediaPaths = normalizeImagePaths(entry.image_paths ?? entry.image_path);
      if (mediaPaths.length) {
        const gallery = document.createElement("div");
        gallery.className = "post-gallery";
        for (const path of mediaPaths) {
          try {
            const image = document.createElement("img");
            image.className = "post-image";
            image.src = await signedImageUrl(supabase, path);
            image.alt = `Ảnh minh họa cho ${entry.title}`;
            image.loading = "lazy";
            gallery.append(image);
          } catch (error) {
            showFailure(error, "Tải ảnh bài viết của bạn", "Nội dung chữ vẫn xem được.");
          }
        }
        item.append(gallery);
      }
      if (entry.status === "approved") {
        const link = document.createElement("a");
        link.href = entry.type === "post"
          ? `?post=${encodeURIComponent(entry.id)}#post-${encodeURIComponent(entry.id)}`
          : `?post=${encodeURIComponent(entry.post_id)}#post-${encodeURIComponent(entry.post_id)}`;
        link.textContent = entry.type === "post" ? "Mở bài viết" : "Mở bài đã bình luận";
        item.append(link);
      }
      if (entry.type === "post") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button-secondary post-delete";
        remove.textContent = "Xóa bài của tôi";
        remove.addEventListener("click", () => void deletePost({ id: entry.id, title: entry.title }));
        item.append(remove);
      }
      accountContentList.append(item);
    }
  }

  async function loadMyContent() {
    if (!currentUser || currentUserIsBanned) {
      accountContent.hidden = true;
      currentAccountContent = { posts: [], comments: [], queue: [] };
      return currentAccountContent;
    }
    const data = await invokeCommunity("get-my-content", {});
    currentAccountContent = data;
    await renderAccountContent(data);
    return data;
  }

  async function processQueueItem(queueItem) {
    try {
      const result = await invokeCommunity("process-moderation", {
        queue_id: queueItem.id,
      });
      await loadMyContent();
      await loadPosts();
      if (result.status === "approved") {
        showStatus("Nội dung đã được AI duyệt và xuất hiện trên cộng đồng.");
      } else if (result.status === "rejected") {
        showStatus(
          "Nội dung chưa phù hợp nên đã được xóa. Hãy chỉnh sửa lời lẽ theo hướng tôn trọng rồi đăng lại.",
          true,
        );
      }
      return true;
    } catch (error) {
      showFailure(error, "Kiểm duyệt nội dung", "Nội dung vẫn ở chế độ riêng tư; hãy tải lại sau ít phút.");
      return false;
    }
  }

  async function processPendingQueue(queue) {
    for (const item of queue || []) {
      if (item.status === "pending" || item.status === "processing") {
        if (!(await processQueueItem(item))) break;
      }
    }
  }

  async function toggleLike(postId, liked) {
    await invokeCommunity("toggle-like", { post_id: postId, liked });
    await loadPosts();
  }

  async function deletePost(post) {
    if (!window.confirm(`Xóa bài “${post.title}” của bạn? Thao tác này không thể hoàn tác.`)) return;
    try {
      await invokeCommunity("delete-post", { post_id: post.id });
      showStatus("Đã xóa bài viết của bạn.");
      await Promise.all([loadMyContent(), loadPosts()]);
    } catch (error) {
      showFailure(error, "Xóa bài viết", "Chỉ có thể xóa bài đăng của chính bạn.");
    }
  }

  async function setPostPinned(postId, pinned) {
    try {
      await invokeCommunity("pin-post", { post_id: postId, pinned });
      showStatus(pinned ? "Đã ghim bài viết." : "Đã bỏ ghim bài viết.");
      await loadPosts();
    } catch (error) {
      showFailure(error, "Ghim bài viết", "Chỉ Owner mới có thể ghim bài viết.");
    }
  }

  async function sharePost(post) {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("post", post.id);
    url.hash = `post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url: url.href });
      } else {
        await navigator.clipboard.writeText(url.href);
        showStatus("Đã sao chép liên kết bài viết.");
      }
      if (currentUser && !currentUserIsBanned) {
        await invokeCommunity("record-share", { post_id: post.id });
        await loadPosts();
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      showFailure(error, "Chia sẻ bài viết", "Hãy sao chép địa chỉ trang từ thanh trình duyệt.");
    }
  }

  function renderSelectedMentions() {
    selectedMentions.replaceChildren();
    for (const user of selectedMentionUsers.values()) {
      const chip = document.createElement("span");
      chip.className = "mention-chip";
      const name = document.createElement("span");
      name.textContent = `@${user.display_name}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Bỏ gắn thẻ ${user.display_name}`);
      remove.addEventListener("click", () => {
        selectedMentionUsers.delete(user.id);
        renderSelectedMentions();
      });
      chip.append(name, remove);
      selectedMentions.append(chip);
    }
  }

  async function searchMentionUsers(query) {
    const revision = ++mentionSearchRevision;
    mentionResults.replaceChildren();
    mentionResults.hidden = true;
    if (query.trim().length < 2) {
      return;
    }
    try {
      const result = await invokeCommunity("search-users", { query });
      if (revision !== mentionSearchRevision) return;
      mentionResults.replaceChildren();
      for (const user of result.users || []) {
        if (selectedMentionUsers.has(user.id)) continue;
        const option = document.createElement("button");
        option.type = "button";
        option.setAttribute("role", "option");
        option.textContent = user.display_name;
        option.addEventListener("click", () => {
          if (selectedMentionUsers.size >= 10) {
            showStatus("Mỗi bài viết có thể gắn thẻ tối đa 10 tài khoản.", true);
            return;
          }
          selectedMentionUsers.set(user.id, user);
          mentionSearchInput.value = "";
          mentionResults.hidden = true;
          renderSelectedMentions();
        });
        mentionResults.append(option);
      }
      mentionResults.hidden = mentionResults.childElementCount === 0;
    } catch (error) {
      if (revision !== mentionSearchRevision) return;
      mentionResults.hidden = true;
      showFailure(error, "Tìm thành viên", "Hãy thử lại sau ít phút.");
    }
  }

  async function loadNotifications() {
    if (!currentUser || currentUserIsBanned) {
      accountNotifications.hidden = true;
      return;
    }
    const { notifications } = await invokeCommunity("get-notifications", {});
    notificationList.replaceChildren();
    accountNotifications.hidden = false;
    if (!notifications?.length) {
      notificationList.textContent = "Bạn chưa có thông báo mới.";
      return;
    }
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    for (const notification of notifications) {
      const item = document.createElement("a");
      item.className = `notification-item${notification.read_at ? "" : " notification-unread"}`;
      item.href = `?post=${encodeURIComponent(notification.post_id)}#post-${encodeURIComponent(notification.post_id)}`;
      item.textContent =
        `${notification.actor_name} đã gắn thẻ bạn trong “${notification.post_title}” · ` +
        formatDate(notification.created_at);
      notificationList.append(item);
    }
    if (unreadIds.length) {
      await invokeCommunity("mark-notifications-read", { notification_ids: unreadIds });
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
    avatarPreview.src = await signedImageUrl(supabase, data.avatar_path);
    } else {
      avatarPreview.removeAttribute("src");
    }
  }

  async function loadPosts() {
    const searchParams = new URLSearchParams(location.search);
    const profileId = searchParams.get("profile");
    const sharedPostId = searchParams.get("post");
    const isProfilePage = Boolean(profileId);
    let viewedProfileAvatarPath = null;
    let sharedPostLoadError = null;
    let sharedPostMissing = false;
    publicProfileView.hidden = !isProfilePage;
    publicProfileAvatar.hidden = true;
    postPanel.hidden = isProfilePage || !currentUser || !currentRole || currentUserIsBanned;
    openPostButton.hidden = isProfilePage || !currentUser || !currentRole || currentUserIsBanned;
    postPanel.hidden = postPanel.hidden || !composerOpen;
    const postsTitle = document.getElementById("posts-title");
    postsTitle.textContent = isProfilePage ? "Bài viết đã duyệt" : "Bài đăng cộng đồng";
    if (isProfilePage) {
      document.getElementById("community-feed-title").textContent = "Trang cá nhân";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
        publicProfileName.textContent = "Không tìm thấy hồ sơ.";
        postsList.replaceChildren();
        return { postsLoaded: false, commentsError: null };
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_path")
        .eq("id", profileId)
        .maybeSingle();
      if (profileError || !profile) {
        if (profileError) showFailure(profileError, "Tải hồ sơ", "Hãy tải lại trang sau ít phút.");
        publicProfileName.textContent = "Không tìm thấy hồ sơ.";
        postsList.replaceChildren();
        return { postsLoaded: false, commentsError: null };
      }
      publicProfileName.textContent = profile.display_name || "Thành viên";
      publicProfileAvatar.hidden = !profile.avatar_path;
      viewedProfileAvatarPath = profile.avatar_path;
    } else {
      document.getElementById("community-feed-title").textContent = "Bảng tin cộng đồng";
    }

    let postsQuery = supabase
      .from("posts")
      .select(
        "id, author_id, title, literary_work, analysis, image_path, image_paths, location_tags, image_ratio, is_pinned, created_at, profiles(display_name, avatar_path)",
      )
      .eq("status", "approved")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (isProfilePage) postsQuery = postsQuery.eq("author_id", profileId);
    const tagFilter = searchParams.get("tag");
    activeTagFilter.hidden = !tagFilter || isProfilePage;
    activeTagFilter.replaceChildren();
    if (tagFilter && !isProfilePage) {
      activeTagFilter.textContent = `Bài viết có hashtag ${tagFilter} · `;
      const clearTagFilter = document.createElement("a");
      clearTagFilter.href = "?#community-feed";
      clearTagFilter.textContent = "Xóa bộ lọc";
      activeTagFilter.append(clearTagFilter);
      postsQuery = postsQuery.contains("location_tags", [tagFilter]);
    }
    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      showFailure(postsError, "Tải bài đăng", "Hãy kiểm tra kết nối rồi thử tải lại.");
      return { postsLoaded: false, commentsError: null };
    }
    if (
      !isProfilePage &&
      sharedPostId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sharedPostId) &&
      !posts.some((post) => post.id === sharedPostId)
    ) {
      const { data: sharedPost, error } = await supabase
        .from("posts")
        .select(
          "id, author_id, title, literary_work, analysis, image_path, image_paths, location_tags, image_ratio, is_pinned, created_at, profiles(display_name, avatar_path)",
        )
        .eq("id", sharedPostId)
        .eq("status", "approved")
        .maybeSingle();
      if (error) {
        sharedPostLoadError = error;
      } else if (sharedPost) {
        posts.push(sharedPost);
      } else {
        sharedPostMissing = true;
      }
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

    const imagePaths = [
      viewedProfileAvatarPath,
      ...posts.flatMap((post) => normalizeImagePaths(post.image_paths ?? post.image_path)),
      ...posts.map((post) => post.profiles?.avatar_path),
      ...comments.map((comment) => comment.profiles?.avatar_path),
    ].filter(Boolean);
    const imageUrls = new Map();
    let imageLoadError = null;
    await Promise.all([...new Set(imagePaths)].map(async (path) => {
      try {
        imageUrls.set(path, await signedImageUrl(supabase, path));
      } catch (error) {
        if (!imageLoadError) imageLoadError = error;
      }
    }));
    if (viewedProfileAvatarPath && imageUrls.has(viewedProfileAvatarPath)) {
      publicProfileAvatar.src = imageUrls.get(viewedProfileAvatarPath);
      publicProfileAvatar.hidden = false;
    }

    const likeData = new Map();
    let likesError = null;
    const postMetadata = new Map();
    if (posts.length) {
      const postIds = posts.map((post) => post.id);
      const [{ data: likes, error: rpcLikesError }, { data: metadata, error: metadataError }] =
        await Promise.all([
          supabase.rpc("get_community_post_likes", { p_post_ids: postIds }),
          supabase.rpc("get_community_post_metadata", { p_post_ids: postIds }),
        ]);
      if (rpcLikesError || metadataError) {
        likesError = rpcLikesError || metadataError;
        console.error("[Cộng đồng] Không thể tải lượt thích.", {
          code: likesError.code,
          message: likesError.message,
        });
      } else {
        for (const item of likes || []) likeData.set(item.post_id, item);
        for (const item of metadata || []) postMetadata.set(item.post_id, item);
      }
    }

    const pendingComments = currentUser && !isProfilePage
      ? (currentAccountContent?.comments || []).filter(
        (comment) => comment.status === "pending",
      )
      : [];
    const commentsByPostId = new Map();
    for (const comment of comments) {
      const postComments = commentsByPostId.get(comment.post_id) || [];
      postComments.push({
        ...comment,
        profiles: comment.profiles
          ? {
            ...comment.profiles,
            avatar_url: imageUrls.get(comment.profiles.avatar_path) || "",
          }
          : null,
      });
      commentsByPostId.set(comment.post_id, postComments);
    }
    const pendingCommentsByPostId = new Map();
    for (const comment of pendingComments) {
      const postComments = pendingCommentsByPostId.get(comment.post_id) || [];
      postComments.push(comment);
      pendingCommentsByPostId.set(comment.post_id, postComments);
    }
    renderPosts(
      posts.map((post) => {
        const mediaPaths = normalizeImagePaths(post.image_paths ?? post.image_path);
        return {
          ...post,
          image_paths: mediaPaths,
          location_tags: post.location_tags || [],
          image_urls: new Map(mediaPaths.map((path) => [path, imageUrls.get(path) || ""])),
          image_url: imageUrls.get(mediaPaths[0]) || "",
          profiles: post.profiles
            ? {
              ...post.profiles,
              avatar_url: imageUrls.get(post.profiles.avatar_path) || "",
            }
            : null,
          post_comments: commentsByPostId.get(post.id) || [],
          pending_comments: pendingCommentsByPostId.get(post.id) || [],
        };
      }),
      currentUser,
      currentRole,
      requestBan,
      currentUserIsBanned,
      Boolean(currentRole) && !currentUserIsBanned,
      Boolean(commentsError),
      likeData,
      postMetadata,
    );
    if (sharedPostId) {
      requestAnimationFrame(() => {
        document.getElementById(`post-${sharedPostId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
    if (commentsError) {
      showFailure(commentsError, "Tải bình luận", "Bài viết vẫn xem được; hãy thử tải lại.");
    } else if (likesError) {
      showFailure(likesError, "Tải lượt thích", "Bài viết vẫn xem được; hãy thử tải lại.");
    } else if (imageLoadError) {
      showFailure(imageLoadError, "Tải ảnh cộng đồng", "Phần chữ vẫn xem được; hãy tải lại sau.");
    } else if (sharedPostLoadError) {
      showFailure(sharedPostLoadError, "Tải bài viết được chia sẻ", "Hãy mở lại liên kết sau ít phút.");
    } else if (sharedPostMissing) {
      showStatus("Bài viết không còn tồn tại hoặc chưa được duyệt.", true);
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
          showFailure(error, "Kiểm duyệt bài viết", "Hãy tải lại danh sách rồi thử lại.");
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
            showFailure(error, "Xử lý đề xuất BAN", "Hãy tải lại danh sách rồi thử lại.");
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
            showFailure(error, "Gỡ thông báo", "Hãy thử lại sau ít phút.");
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
      showFailure(error, "Cấm tài khoản", "Hãy kiểm tra lý do và thử lại.");
    }
  }

  function updateAccount(session) {
    currentUser = session?.user || null;
    const signedIn = Boolean(currentUser);
    authPanel.hidden = signedIn;
    accountPanel.hidden = !signedIn;
    accountContent.hidden = !signedIn || currentUserIsBanned;
    accountNotifications.hidden = !signedIn || !currentRole || currentUserIsBanned;
    openPostButton.hidden = !signedIn || !currentRole || currentUserIsBanned;
    postPanel.hidden = openPostButton.hidden || !composerOpen;
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
    currentAccountContent = null;
    currentRole = null;
    currentUserIsBanned = false;
    updateAccount(session);
    if (!session) {
      currentProfile = null;
      currentAccountContent = null;
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
      showFailure(error, "Xác thực quyền tài khoản", "Hãy tải lại trang hoặc đăng nhập lại.");
      return;
    }

    if (revision !== authRevision) return;
    currentRole = access.role;
    currentUserIsBanned = access.banned;
    updateAccount(session);
    let accessStatus = "";
    let profileError = null;
    let accountContentError = null;
    let notificationError = null;
    let accountContentData = null;
    if (currentUserIsBanned) {
      accessStatus = access.ban_expires_at
        ? `Tài khoản đang bị cấm đến ${formatDate(access.ban_expires_at)}.`
        : "Tài khoản đang bị cấm vĩnh viễn.";
    } else {
      try {
        await loadProfile();
      } catch (error) {
        profileError = error;
      }
      try {
        accountContentData = await loadMyContent();
      } catch (error) {
        accountContentError = error;
      }
      try {
        await loadNotifications();
      } catch (error) {
        notificationError = error;
      }
    }

    await loadPosts();
    if (accessStatus) showStatus(accessStatus, true);
    else if (profileError) showFailure(profileError, "Tải hồ sơ", "Hãy thử tải lại trang.");
    else if (accountContentError) {
      showFailure(accountContentError, "Tải nội dung cá nhân", "Hãy đăng nhập lại rồi thử tải lại.");
    } else if (notificationError) {
      showFailure(notificationError, "Tải thông báo", "Hãy tải lại trang sau ít phút.");
    }
    if (accountContentData?.queue?.length) {
      void processPendingQueue(accountContentData.queue);
    }
    if (
      !currentUserIsBanned &&
      (currentRole === "moderator" || currentRole === "owner")
    ) {
      try {
        await loadModerationData();
      } catch (error) {
        showFailure(error, "Tải công cụ kiểm duyệt", "Hãy thử tải lại trang.");
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
      showFailure(error, "Đăng nhập", "Hãy kiểm tra thông tin và thử lại.");
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
        throw userError("Mật khẩu phải có ít nhất 8 ký tự.");
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
      showFailure(error, "Tạo tài khoản", "Hãy kiểm tra email và thử lại.");
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
        throw userError("Tên hiển thị phải có từ 1 đến 80 ký tự.");
      }

      const file = avatarFileInput.files[0];
      uploadedPath = await uploadImage(file, currentUser.id, "avatars");
      const avatarPath = uploadedPath || currentProfile?.avatar_path || null;
      const previousAvatarPath = currentProfile?.avatar_path;
      const replacedAvatarPath = uploadedPath;
      await invokeCommunity("update-profile", {
        display_name: displayName,
        avatar_path: avatarPath,
      });

      uploadedPath = null;
      currentProfile = { display_name: displayName, avatar_path: avatarPath };
      avatarFileInput.value = "";
      avatarPreview.hidden = !avatarPath;
      if (avatarPath) avatarPreview.src = await signedImageUrl(supabase, avatarPath);
      if (replacedAvatarPath && previousAvatarPath) {
        await removeUploadedImage(previousAvatarPath);
      }
      showStatus("Đã lưu hồ sơ sau khi kiểm duyệt.");
      await loadPosts();
    } catch (error) {
      await removeUploadedImage(uploadedPath);
      showFailure(error, "Lưu hồ sơ", "Hãy kiểm tra dữ liệu, ảnh đại diện và thử lại.");
    } finally {
      setBusy(saveProfileButton, false);
    }
  }

  async function publishPost(event) {
    event.preventDefault();
    setBusy(publishButton, true, "Đang gửi vào hàng chờ...");
    let uploadedPaths = [];
    try {
      const formData = new FormData(postForm);
      const title = formData.get("title").trim();
      const literaryWork = formData.get("literary_work").trim();
      const analysis = formData.get("analysis").trim();
      const locationTags = formData.get("location_tags")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => `#${tag.replace(/^#+/, "").replace(/\s+/g, "")}`);
      const uniqueLocationTags = [...new Set(locationTags)];
      const imageRatio = formData.get("image_ratio");
      const files = Array.from(formData.getAll("image")).filter(
        (file) => file instanceof File && file.size > 0,
      );
      if (!title || title.length > 120) {
        throw userError("Tiêu đề phải có từ 1 đến 120 ký tự.");
      }
      if (literaryWork.length > 180) {
        throw userError("Tác phẩm hoặc địa danh không được dài quá 180 ký tự.");
      }
      if (analysis.length < 10 || analysis.length > 5000) {
        throw userError("Nội dung phân tích cần từ 10 đến 5.000 ký tự.");
      }
      if (files.length > MAX_POST_IMAGES) {
        throw userError(`Bạn có thể đăng tối đa ${MAX_POST_IMAGES} ảnh trong một bài.`);
      }
      if (
        uniqueLocationTags.length > 8 ||
        uniqueLocationTags.some((tag) => tag.length < 2 || tag.length > 41)
      ) {
        throw userError("Bạn có thể thêm tối đa 8 hashtag địa danh, mỗi thẻ tối đa 40 ký tự.");
      }

      uploadedPaths = await uploadImages(files, currentUser.id, "posts");
      await invokeCommunity("create-post", {
        title,
        literary_work: literaryWork,
        analysis,
        image_path: uploadedPaths[0] || null,
        image_paths: uploadedPaths,
        location_tags: uniqueLocationTags,
        image_ratio: imageRatio,
        mention_user_ids: [...selectedMentionUsers.keys()],
      });

      uploadedPaths = [];
      postForm.reset();
      selectedMentionUsers.clear();
      renderSelectedMentions();
      mentionResults.hidden = true;
      composerOpen = false;
      postPanel.hidden = true;
      openPostButton.hidden = false;
      updateCharacterCount("post-title-input", "post-title-count");
      updateCharacterCount("post-analysis", "post-analysis-count");
      renderPostImagePreview();
      showStatus("Bài viết đã được gửi vào hàng chờ; hiện chỉ bạn nhìn thấy.");
      const accountData = await loadMyContent();
      await loadNotifications();
      await loadPosts();
      void processPendingQueue(accountData.queue);
    } catch (error) {
      await Promise.all(uploadedPaths.map((path) => removeUploadedImage(path)));
      showFailure(error, "Đăng bài", "Hãy kiểm tra nội dung và ảnh rồi thử lại.");
    } finally {
      setBusy(publishButton, false);
    }
  }

  async function submitComment(event, form, button, postId) {
    event.preventDefault();
    setBusy(button, true, "Đang gửi...");
    try {
      const content = new FormData(form).get("content").trim();
      if (!content || content.length > 2000) {
        throw userError("Bình luận không được để trống và tối đa 2.000 ký tự.");
      }
      await invokeCommunity("create-comment", { post_id: postId, content });
      form.reset();
      showStatus("Bình luận đã được gửi vào hàng chờ; hiện chỉ bạn nhìn thấy.");
      const accountData = await loadMyContent();
      await loadPosts();
      void processPendingQueue(accountData.queue);
    } catch (error) {
      showFailure(error, "Đăng bình luận", "Hãy kiểm tra nội dung và thử lại.");
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
      showFailure(error, "Thay đổi Moderator", "Hãy kiểm tra email tài khoản rồi thử lại.");
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
      showFailure(error, "Đăng thông báo", "Hãy kiểm tra tiêu đề và nội dung rồi thử lại.");
    }
  }

  document.getElementById("refresh-button").addEventListener("click", async () => {
    try {
      const data = await loadMyContent();
      await loadPosts();
      await loadNotifications();
      await processPendingQueue(data.queue);
    } catch (error) {
      showFailure(error, "Tải lại cộng đồng", "Hãy đăng nhập lại hoặc thử lại sau.");
    }
  });
  document.getElementById("sign-out-button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showFailure(error, "Đăng xuất", "Hãy tải lại trang rồi thử lại.");
  });
  openPostButton.addEventListener("click", () => {
    composerOpen = true;
    postPanel.hidden = false;
    postTitleInput.focus();
    postPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  closePostButton.addEventListener("click", () => {
    composerOpen = false;
    postPanel.hidden = true;
    openPostButton.focus();
  });
  mentionSearchInput.addEventListener("input", () => {
    clearTimeout(mentionSearchTimer);
    const query = mentionSearchInput.value;
    mentionSearchTimer = setTimeout(() => void searchMentionUsers(query), 250);
  });
  document.addEventListener("click", (event) => {
    if (!mentionResults.contains(event.target) && event.target !== mentionSearchInput) {
      mentionResults.hidden = true;
    }
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
    showFailure(sessionError, "Kiểm tra phiên đăng nhập", "Hãy tải lại trang.");
  } else {
    await handleSession(sessionData.session);
  }
}
