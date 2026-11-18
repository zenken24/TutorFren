#!/usr/bin/env bash
# Fails if a security invariant from CLAUDE.md is broken.
set -u
cd "$(dirname "$0")/.."
fail=0
err() { echo "INVARIANT FAILED: $1"; fail=1; }

MIG=supabase/migrations
if [ -d "$MIG" ] && ls "$MIG"/*.sql >/dev/null 2>&1; then
  for t in $(grep -hoiE 'create table (if not exists )?(public\.)?[a-z_]+' "$MIG"/*.sql | awk '{print $NF}' | sed 's/^public\.//' | sort -u); do
    grep -qiE "alter table (public\.)?$t enable row level security" "$MIG"/*.sql || err "(a) table '$t' has no 'enable row level security'"
  done
  grep -niE '\bbytea\b' "$MIG"/*.sql && err "(b) bytea column in a migration"
  grep -niE "^[[:space:]]*[a-z_]*(audio|voice|recording)[a-z_]*[[:space:]]+(text|bytea|jsonb|uuid|varchar)" "$MIG"/*.sql && err "(b) audio/voice/recording column"
  grep -niE "storage\.buckets.*(audio|voice|recording)" "$MIG"/*.sql && err "(b) audio/voice/recording bucket"
fi

APP=apps/mobile
if [ -d "$APP" ]; then
  grep -rnE 'SUPABASE_SERVICE_ROLE_KEY|service_role' "$APP" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' --exclude-dir=node_modules && err "(c) service role reference under apps/mobile"
  grep -rn 'AsyncStorage' "$APP/src" "$APP/package.json" && err "AsyncStorage used in the app (tokens must stay in SecureStore)"
  grep -rn 'GEMINI_API_KEY' "$APP" --exclude-dir=node_modules && err "(f) GEMINI_API_KEY under apps/mobile"
  [ -d "$APP/src/app/(student)" ] && grep -rnE 'useGuardian\b|_guardian\b|GuardianGate|useStepUp' "$APP/src/app/(student)" && err "student screen imports the guardian client"
fi

FN=supabase/functions
if [ -d "$FN" ]; then
  grep -rnE '(console\.(log|info|warn|error)|log(ger)?\.[a-z]+)\(.*(req\.body|transcript|\.text\b)' "$FN" --include='*.ts' --exclude='*.test.ts' && err "(d) log call includes body/transcript/text"
  grep -rlE "@google/genai" "$FN" content evals --include='*.ts' 2>/dev/null | grep -v "^$FN/_shared/llm.ts$" && err "(e) @google/genai imported outside _shared/llm.ts"
fi

if [ $fail -eq 0 ]; then echo "All invariants hold."; else exit 1; fi
