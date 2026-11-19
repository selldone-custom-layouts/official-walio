#!/usr/bin/env bash
# Build, check, package, upload and verify one release of this Layout.
#
# usage: bash scripts/release.sh <new-version> [desk|home]
#
# Needs (see the wiki page "Build and Upload"):
#   SELLDONE_CLI      root of the globally installed selldone-cli
#                     (default: "$(npm root -g)/selldone-cli")
#   SELLDONE_CLI_SRC  a clone of https://github.com/selldone/cli (for package_layout.py)
#   LAYOUT_ID         your Layout's id on Selldone (shown after your first upload)
#
# The CLI must be signed in first: run `selldone`, choose Login, type your 2FA code.
set -euo pipefail
cd "$(dirname "$0")/.."

V="${1:?usage: bash scripts/release.sh <new-version> [desk|home]}"
ACCOUNT="${2:-desk}"
SELLDONE_CLI="${SELLDONE_CLI:-$(npm root -g)/selldone-cli}"
: "${SELLDONE_CLI_SRC:?set SELLDONE_CLI_SRC to a clone of github.com/selldone/cli}"
PACKAGER="$SELLDONE_CLI_SRC/.agents/skills/package-selldone-storefront-layout/scripts/package_layout.py"

# 1. A new version every time. A number is used up even when an upload fails.
sed -i -E "s/\"version\": \"[0-9.]+\"/\"version\": \"$V\"/" manifest.json
grep '"version"' manifest.json

# 2. Build. The account design: desk (side rail) or home (tabs).
if [ "$ACCOUNT" = "desk" ]; then export VITE_KALIO_ACCOUNT=desk; else unset VITE_KALIO_ACCOUNT || true; fi
npm run build-production

# 3. Every ZIP member must sit under app/.
rm -f dist/index.html

# 4. Selldone accepts only passive SVG attributes.
node scripts/kalio-svg-flatten.mjs dist/app | tail -1

# 5. Checks that block a release.
J=$(find dist/app -type f \( -name '*.js' -o -name '*.mjs' \) -exec file -b --mime-type {} \; | grep -c text/x-java || true)
S=$( (grep -l 'from"../shop.js"' -r dist/app || true) | wc -l)
N=$(find dist -type f | wc -l)
echo "java-mime:$J shop.js-imports:$S files:$N (keep under ~360)"
[ "$J" = 0 ] && [ "$S" = 0 ] || { echo "CHECK FAILED"; exit 1; }

# 6. Package (always --force, or an old dist.zip is kept) and prove the ZIP is this build.
# Without a working Python (Windows' "python" alias only opens the Store), the Node port of the same packager
# and validator (scripts/package-layout.mjs, jszip) builds the same archive.
if python --version >/dev/null 2>&1; then
  python "$PACKAGER" dist dist.zip --manifest manifest.json --force
else
  node scripts/package-layout.mjs dist dist.zip --manifest manifest.json --force
fi
unzip -p dist.zip app/shop.js | cmp - dist/app/shop.js && echo "zip matches dist"

# 7. Upload, then check on the server, not by exit code.
node --use-system-ca scripts/kalio-deploy.mjs "$SELLDONE_CLI"
if [ -n "${LAYOUT_ID:-}" ]; then
  node --use-system-ca scripts/kalio-verify-deploy.mjs "$SELLDONE_CLI" "$LAYOUT_ID" dist/app
else
  echo "Set LAYOUT_ID to check the upload on the server (wiki: Build and Upload)."
fi
