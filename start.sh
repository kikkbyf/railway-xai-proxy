#!/usr/bin/env bash

set -euo pipefail

# Railway 启动时通过环境变量注入认证信息与白名单来源 IP。
: "${PROXY_USER:?missing PROXY_USER}"
: "${PROXY_PASS:?missing PROXY_PASS}"
: "${ALLOW_IPS:?missing ALLOW_IPS}"

PASSWD_FILE="/etc/squid/passwd"
ALLOW_FILE="/tmp/squid-allow.conf"
OUTPUT_CONF="/tmp/squid.conf"

htpasswd -bc "$PASSWD_FILE" "$PROXY_USER" "$PROXY_PASS"

rm -f "$ALLOW_FILE"
IFS=',' read -r -a ALLOW_LIST <<< "$ALLOW_IPS"
for raw_ip in "${ALLOW_LIST[@]}"; do
  ip="$(printf '%s' "$raw_ip" | xargs)"
  if [ -n "$ip" ]; then
    printf 'acl allowed_src src %s\n' "$ip" >> "$ALLOW_FILE"
  fi
done

if [ ! -s "$ALLOW_FILE" ]; then
  echo "ALLOW_IPS did not produce any usable IP rule" >&2
  exit 1
fi

awk -v allow_file="$ALLOW_FILE" '
  /^# __ALLOW_RULES__$/ {
    while ((getline line < allow_file) > 0) {
      print line
    }
    close(allow_file)
    next
  }
  { print }
' /etc/squid/squid.conf > "$OUTPUT_CONF"

exec squid -N -f "$OUTPUT_CONF"
