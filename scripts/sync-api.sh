#!/bin/bash
# Helper script to rebuild API and commit changes together
# Usage: ./scripts/sync-api.sh "Your commit message"

echo "🔄 Rebuilding api/index.js from TypeScript source..."
npm run build:api

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📝 Staged files:"
    git add server/api/ api/index.js
    git status --short
    
    if [ -n "$1" ]; then
        echo ""
        echo "💾 Committing with message: $1"
        git commit -m "$1"
        echo "✅ Done! Run 'git push' to deploy."
    else
        echo ""
        echo "⚠️  No commit message provided. Files are staged, ready to commit."
        echo "   Run: git commit -m 'Your message'"
    fi
else
    echo "❌ Build failed! Fix errors before committing."
    exit 1
fi
