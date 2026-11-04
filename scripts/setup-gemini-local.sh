#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Lỗi: %s\n' "$1" >&2
  exit 1
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
  fail 'Hãy chạy script trong Git repository.'
cd "$repo_root"

read -r -s -p 'Gemini API key (chỉ lưu local, không dán vào chat): ' gemini_api_key
printf '\n'
[[ -n "$gemini_api_key" ]] || fail 'Gemini API key không được để trống.'

GEMINI_API_KEY="$gemini_api_key" node - "$repo_root/supabase/.env.local" <<'NODE'
const fs = require("node:fs");
const key = process.env.GEMINI_API_KEY;
if (!key || /[\r\n]/.test(key)) {
  process.exitCode = 1;
} else {
  fs.writeFileSync(
    process.argv[2],
    `GEMINI_API_KEY=${JSON.stringify(key)}\nGEMINI_MODEL=gemini-3.5-flash-lite\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}
NODE

unset gemini_api_key GEMINI_API_KEY
printf '%s\n' 'Đã lưu Gemini API key vào supabase/.env.local.'
printf '%s\n' 'File này nằm trong .gitignore; script không kết nối Supabase/GitHub.'
