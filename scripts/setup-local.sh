#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Lỗi: %s\n' "$1" >&2
  exit 1
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
  fail 'Hãy chạy script trong Git repository.'
cd "$repo_root"

read -r -p 'Supabase URL (https://<project-ref>.supabase.co): ' supabase_url
[[ "$supabase_url" =~ ^https://[a-zA-Z0-9-]+\.supabase\.co$ ]] || \
  fail 'Supabase URL không hợp lệ.'

read -r -s -p 'Supabase publishable/anon key: ' supabase_anon_key
printf '\n'
if [[ "$supabase_anon_key" == sb_publishable_* ]]; then
  :
elif [[ "$supabase_anon_key" == eyJ* ]]; then
  if ! SUPABASE_KEY="$supabase_anon_key" node -e '
    try {
      const payload = process.env.SUPABASE_KEY.split(".")[1];
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      process.exit(claims.role === "anon" ? 0 : 1);
    } catch {
      process.exit(1);
    }
  '; then
    fail 'Legacy JWT phải có role anon; không nhập service_role/secret key.'
  fi
else
  fail 'Chỉ nhập publishable key hoặc legacy anon key.'
fi

node - "$repo_root/js/supabase-config.js" "$supabase_url" "$supabase_anon_key" <<'NODE'
const fs = require("node:fs");
const [filePath, url, key] = process.argv.slice(2);
const config = [
  `export const SUPABASE_URL = ${JSON.stringify(url)};`,
  `export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};`,
  "",
].join("\n");
fs.writeFileSync(filePath, config, { encoding: "utf8" });
NODE

unset supabase_anon_key
printf '%s\n' 'Đã lưu cấu hình Supabase chỉ trong js/supabase-config.js trên máy này.'
printf '%s\n' 'Script không chạy migration, không tạo commit và không deploy.'
