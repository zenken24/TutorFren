#!/usr/bin/env bash
# Writes local dev .env files from the running local Supabase stack (keeps any Gemini keys already set).
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
[ -n "${ANON_KEY:-}" ] || { echo "Local Supabase is not running. Run: npx supabase start"; exit 1; }
F=supabase/functions/.env
[ -f "$F" ] || cp supabase/functions/.env.example "$F"
set_kv() { if grep -q "^$1=" "$F"; then sed -i.bak "s|^$1=.*|$1=$2|" "$F" && rm -f "$F.bak"; else echo "$1=$2" >> "$F"; fi; }
set_kv SUPABASE_URL "$API_URL"; set_kv SUPABASE_SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"; set_kv SUPABASE_ANON_KEY "$ANON_KEY"
# Expo Go on a real phone must reach this computer: use the LAN IP instead of 127.0.0.1
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 127.0.0.1)
# Phone on USB with `adb reverse tcp:54321 tcp:54321`? Then the phone reaches this computer as 127.0.0.1.
if [ "${TF_NETWORK:-}" = "usb" ] || adb reverse --list 2>/dev/null | grep -q "tcp:54321"; then IP=127.0.0.1; echo "USB mode (adb reverse found): using 127.0.0.1"; fi
printf 'EXPO_PUBLIC_SUPABASE_URL=http://%s:54321\nEXPO_PUBLIC_SUPABASE_ANON_KEY=%s\n' "${IP:-127.0.0.1}" "$ANON_KEY" > apps/mobile/.env
echo "wrote $F and apps/mobile/.env (API at http://${IP:-127.0.0.1}:54321)"
