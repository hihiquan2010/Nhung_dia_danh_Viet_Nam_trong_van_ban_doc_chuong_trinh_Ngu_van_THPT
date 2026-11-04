#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--confirm-deploy" ]]; then
  printf '%s\n' \
    'Script này thay đổi Supabase và GitHub, tạo commit và push lên remote.' \
    'Để từ chối triển khai, dừng tại đây. Chỉ chủ động chạy lại với --confirm-deploy nếu muốn thực hiện.'
  exit 2
fi

project_ref="${2:-}"
if [[ -z "$project_ref" || ! "$project_ref" =~ ^[a-zA-Z0-9-]+$ ]]; then
  printf 'Cách dùng: bash scripts/deploy.sh --confirm-deploy <supabase-project-ref>\n' >&2
  exit 2
fi

fail() {
  printf 'Lỗi: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Cần cài '$1' trước khi tiếp tục."
}

if ! command -v gh >/dev/null 2>&1; then
  for gh_dir in "/c/Program Files/GitHub CLI" "/c/Program Files (x86)/GitHub CLI"; do
    if [[ -x "$gh_dir/gh.exe" ]]; then
      PATH="$gh_dir:$PATH"
      export PATH
      break
    fi
  done
fi

require_command git
require_command gh
require_command curl
require_command node

if command -v supabase >/dev/null 2>&1; then
  supabase_cli=supabase
elif command -v supabase.cmd >/dev/null 2>&1; then
  supabase_cli=supabase.cmd
else
  fail "Cần cài Supabase CLI trước khi tiếp tục."
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "Hãy chạy script trong Git repository."
cd "$repo_root"

gh auth status >/dev/null 2>&1 || fail "Hãy đăng nhập GitHub CLI bằng 'gh auth login'."

branch="$(git branch --show-current)"
default_branch="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)"
[[ -n "$branch" && "$branch" == "$default_branch" ]] || \
  fail "Hãy chuyển sang nhánh mặc định '$default_branch' trước khi deploy."
git diff --cached --quiet || fail 'Hãy commit hoặc bỏ stage các thay đổi đã stage trước khi deploy.'

printf '%s\n' '=== Cấu hình Supabase ==='
supabase_url="https://${project_ref}.supabase.co"

if ! "$supabase_cli" projects list >/dev/null 2>&1; then
  read -r -s -p 'Supabase access token (để đăng nhập CLI): ' access_token
  printf '\n'
  [[ -n "$access_token" ]] || fail 'Supabase access token không được để trống.'
  "$supabase_cli" login --token "$access_token"
  unset access_token
fi

"$supabase_cli" projects list | grep -Fq "$project_ref" || \
  fail "Project '$project_ref' không có trong tài khoản Supabase hiện tại."

keys_json="$("$supabase_cli" projects api-keys --remote="$project_ref" --output json)"
supabase_anon_key="$(printf '%s' "$keys_json" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    const keys = JSON.parse(input);
    const key = keys.find((item) => item.type === "publishable")
      || keys.find((item) => item.id === "anon");
    if (!key?.api_key) process.exit(1);
    process.stdout.write(key.api_key);
  });
')"
[[ -n "$supabase_anon_key" ]] || fail 'Không lấy được Supabase publishable key.'

deploy_env="supabase/.env.local"
[[ -f "$deploy_env" ]] || \
  fail "Thiếu $deploy_env. Chạy bash scripts/setup-gemini-local.sh và nhập key tại prompt ẩn."
grep -q '^GEMINI_API_KEY=.' "$deploy_env" || \
  fail "Không tìm thấy GEMINI_API_KEY trong $deploy_env."

"$supabase_cli" migration up \
  --remote="$project_ref" \
  --include-all \
  --yes

"$supabase_cli" secrets set \
  --yes \
  --remote="$project_ref" \
  --env-file "$deploy_env"
"$supabase_cli" functions deploy community-api \
  --yes \
  --remote="$project_ref" \
  --use-api

git add \
  .gitignore \
  .github/workflows/deploy.yml \
  README.md \
  community.html \
  css/community.css \
  css/style.css \
  html/game.html \
  html/header_footer_fplaces.js \
  index.html \
  js/community.js \
  js/game.js \
  js/homepage-community.js \
  js/header_footer.js \
  js/site_chrome.js \
  scripts/deploy.sh \
  scripts/run-community-local.sh \
  scripts/setup-owner.sh \
  scripts/setup-gemini-local.sh \
  scripts/setup-local.sh \
  supabase/.env.example \
  supabase/config.toml \
  supabase/functions/community-api/index.ts \
  supabase/migrations/20261103000000_community.sql \
  supabase/migrations/20261104000000_community_data_and_storage.sql \
  supabase/migrations/20261104210000_community_roles_moderation.sql \
  css/game.css \
  css/recommendGroup.css \
  css/titleFont.css \
  css/work_pages.css
if ! git diff --cached --quiet; then
  git commit \
    -m "Add Supabase community and post moderation" \
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
fi

printf '%s' "$supabase_url" | gh secret set SUPABASE_URL
printf '%s' "$supabase_anon_key" | gh secret set SUPABASE_ANON_KEY
unset supabase_anon_key

printf '%s\n' '=== Bật GitHub Pages và triển khai ==='
gh api "repos/{owner}/{repo}/pages" --method POST -f build_type=workflow >/dev/null 2>&1 || \
  gh api "repos/{owner}/{repo}/pages" --method PUT -f build_type=workflow >/dev/null

git push origin "$branch"

printf '%s\n' 'Đã đẩy bản triển khai. Theo dõi workflow bằng: gh run watch'
