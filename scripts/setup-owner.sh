#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Lỗi: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Cần cài '$1' trước khi tiếp tục."
}

require_command git
require_command node

if command -v supabase >/dev/null 2>&1; then
  supabase_cli=supabase
elif command -v supabase.cmd >/dev/null 2>&1; then
  supabase_cli=supabase.cmd
else
  fail 'Cần cài Supabase CLI.'
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
  fail 'Hãy chạy script trong Git repository.'
cd "$repo_root"

project_ref="${1:-}"
if [[ -z "$project_ref" || ! "$project_ref" =~ ^[a-zA-Z0-9-]+$ ]]; then
  fail 'Cách dùng: bash scripts/setup-owner.sh <supabase-project-ref>'
fi

printf '%s\n' 'Tài khoản phải đăng ký và xác nhận email trước.'
read -r -p 'Email chính xác của tài khoản Owner đầu tiên: ' owner_email
[[ "$owner_email" =~ ^[^[:space:]\'\"]+@[^[:space:]\'\"]+\.[^[:space:]\'\"]+$ ]] || \
  fail 'Email không hợp lệ.'

owner_sql="$(OWNER_EMAIL="$owner_email" node <<'NODE'
const email = process.env.OWNER_EMAIL;
if (!email || /[\r\n]/.test(email)) process.exit(1);
const escapedEmail = email.replaceAll("'", "''");
process.stdout.write(`
do $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where lower(email) = lower('${escapedEmail}')
    and email_confirmed_at is not null;

  if target_id is null then
    raise exception 'No confirmed account matches that email.';
  end if;

  if exists (
    select 1
    from public.community_user_roles
    where role = 'owner' and user_id <> target_id
  ) then
    raise exception 'An owner already exists; use owner controls to manage moderators.';
  end if;

  insert into public.community_user_roles (user_id, role, changed_by)
  values (target_id, 'owner', target_id)
  on conflict (user_id) do update
  set role = 'owner',
      changed_by = excluded.changed_by,
      changed_at = now();

  insert into public.community_security_audit (actor_id, target_user_id, action)
  values (target_id, target_id, 'initial_owner_bootstrapped');
end;
$$;
`);
NODE
)"

"$supabase_cli" projects list >/dev/null 2>&1 || \
  fail "Hãy đăng nhập Supabase CLI trước bằng 'supabase login'."
"$supabase_cli" projects list | grep -Fq "$project_ref" || \
  fail "Project '$project_ref' không có trong tài khoản Supabase CLI hiện tại."

printf '%s\n' 'Gán role Owner cho tài khoản đã xác nhận...'
"$supabase_cli" db query \
  --remote="$project_ref" \
  --yes \
  "$owner_sql"
unset owner_email owner_sql
printf '%s\n' 'Đã cấp Owner. Đăng xuất rồi đăng nhập lại để tải quyền mới.'
