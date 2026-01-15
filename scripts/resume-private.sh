#!/bin/bash
set -e

# Constants
SOURCE_MD="docs/resume/resume02-career-history-public.md"
PRIVATE_MD="docs/resume/resume02-career-history-private.md"
PRIVATE_HTML="docs/resume/resume02-career-history-private.html"

echo "📄 Generating private resume files..."

# 1. Get real name from keychain and create private version
echo "✓ Retrieving real name from keychain..."
REAL_NAME=$(security find-generic-password -s "REALNAME" -a "$APP_NAME" -w 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$REAL_NAME" ]; then
    echo "⚠️  Failed to retrieve REALNAME from keychain"
    echo "💡 Add it with: security add-generic-password -s 'REALNAME' -a '$APP_NAME' -w '本名'"
    exit 1
fi

echo "✓ Creating private version with real name..."
sed "s/Aromarious/$REAL_NAME/g" "$SOURCE_MD" > "$PRIVATE_MD"

# 2. Generate HTML for printing
echo "✓ Converting to HTML..."
pandoc "$PRIVATE_MD" -o "$PRIVATE_HTML"

echo "✅ Private resume generated successfully!"
echo "📍 Files created:"
echo "   - $PRIVATE_MD"
echo "   - $PRIVATE_HTML"
echo "💡 HTMLファイルをブラウザで開いてPDFとして印刷してください: $PRIVATE_HTML"