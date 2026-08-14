#!/usr/bin/env bash
# Install med-summit on a path with free disk space.
# Usage: ./scripts/install-local.sh /path/with/free/space/med-summit

set -euo pipefail

INSTALL_PATH="${1:-$HOME/med-summit}"
PARENT="$(dirname "$INSTALL_PATH")"

mkdir -p "$PARENT"

if [[ -d "$INSTALL_PATH/.git" ]]; then
  echo "Repo already exists: $INSTALL_PATH"
  cd "$INSTALL_PATH"
  git pull
else
  git clone --branch cursor/fix-vite-esm-config-ffd3 \
    https://github.com/KapilXSam/med-summit.git "$INSTALL_PATH"
  cd "$INSTALL_PATH"
fi

npm install
node scripts/fix-lovable-vite-config.mjs

echo ""
echo "Done. Start the app with:"
echo "  cd $INSTALL_PATH"
echo "  npm run dev"
echo "Then open http://localhost:8080"
