#!/bin/bash

# Exit on error
set -e

echo "📦 Packaging Omni-Run for Distribution..."

# Ensure we're in the project root
if [ ! -f "wxt.config.ts" ]; then
    echo "❌ Error: Please run this script from the project root."
    exit 1
fi

echo "🌐 Building and zipping Chrome MV3 Extension..."
npx wxt zip -b chrome --mode production

echo "🦊 Building and zipping Firefox MV3 Extension..."
npx wxt zip -b firefox --mode production

echo "✅ Packaging Complete!"
echo "Releases are available in the .output directory."
