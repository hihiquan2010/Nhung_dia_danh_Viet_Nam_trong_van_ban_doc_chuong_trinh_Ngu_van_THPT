#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Lỗi: %s\n' "$1" >&2
  exit 1
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
  fail 'Hãy chạy script trong Git repository.'
cd "$repo_root"

if command -v supabase >/dev/null 2>&1; then
  supabase_cli=supabase
elif command -v supabase.cmd >/dev/null 2>&1; then
  supabase_cli=supabase.cmd
else
  fail 'Cần cài Supabase CLI.'
fi

command -v node >/dev/null 2>&1 || fail 'Cần cài Node.js.'
command -v docker >/dev/null 2>&1 || \
  fail 'Cần cài và khởi động Docker Desktop để chạy Supabase local.'
docker info >/dev/null 2>&1 || \
  fail 'Docker Desktop chưa khởi động hoặc chưa sẵn sàng.'
[[ -f supabase/.env.local ]] || \
  fail 'Chạy bash scripts/setup-gemini-local.sh để lưu API key an toàn trước.'

printf '%s\n' 'Khởi động Supabase local (không kết nối project từ xa)...'
"$supabase_cli" start

printf '%s\n' 'Áp dụng migration vào database local...'
"$supabase_cli" migration up

status_env="$("$supabase_cli" status --output env)"
SUPABASE_STATUS_ENV="$status_env" node - "$repo_root/js/supabase-config.js" <<'NODE'
const fs = require("node:fs");
const lines = process.env.SUPABASE_STATUS_ENV.split(/\r?\n/);

function readValue(name) {
  const line = lines.find((entry) => entry.startsWith(`${name}=`));
  if (!line) return "";
  const value = line.slice(name.length + 1);
  if (value.startsWith('"')) return JSON.parse(value);
  return value;
}

const url = readValue("API_URL");
const key = readValue("ANON_KEY");
if (!url || !key) {
  throw new Error("Supabase CLI status did not include API_URL and ANON_KEY.");
}

fs.writeFileSync(
  process.argv[2],
  `export const SUPABASE_URL = ${JSON.stringify(url)};\nexport const SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`,
  { encoding: "utf8" },
);
NODE

printf '%s\n' ''
printf '%s\n' 'Cộng đồng local: http://127.0.0.1:8765/community.html'
printf '%s\n' 'Mở một Git Bash khác trong folder này và chạy: python -m http.server 8765'
printf '%s\n' 'Supabase Studio local: http://127.0.0.1:54323'
printf '%s\n' 'Email xác nhận test được lưu trong Mailpit: http://127.0.0.1:54324'
printf '%s\n' 'Nhấn Ctrl+C để dừng Edge Function.'
"$supabase_cli" functions serve community-api --env-file supabase/.env.local
