#!/bin/bash
set -e

# Constants
SOURCE_MD="docs/resume/resume02-career-history-public.md"
PUBLIC_PDF="docs/resume/resume02-career-history-public.pdf"
SITE_PDF="apps/nextjs/public/resume.pdf"

echo "📄 Generating public resume PDF..."

# 1. Use source markdown (already anonymized)
echo "✓ Using source markdown..."

# 2. Convert to PDF using weasyprint with custom CSS
echo "✓ Converting to PDF..."
if command -v weasyprint >/dev/null 2>&1; then
    pandoc "$SOURCE_MD" -o "$PUBLIC_PDF" \
        --pdf-engine=weasyprint \
        --css=scripts/resume-style.css \
        --standalone
    echo "✓ PDF generated: $PUBLIC_PDF"
else
    echo "⚠️  weasyprint not found. Install with: brew install weasyprint"
    exit 1
fi

# 3. Copy to public directory
echo "✓ Copying to public directory..."
cp "$PUBLIC_PDF" "$SITE_PDF"

# 4. Clean up intermediate files
echo "✓ Cleaning up intermediate files..."
rm -f "$PUBLIC_PDF" "${PUBLIC_PDF%.pdf}.html"

echo "✅ Resume generated successfully!"
echo "📍 Files created:"
echo "   - $SOURCE_MD (source)"
echo "   - $SITE_PDF"