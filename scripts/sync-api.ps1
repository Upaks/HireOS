# PowerShell script to rebuild API and commit changes together
# Usage: .\scripts\sync-api.ps1 "Your commit message"

param(
    [string]$CommitMessage = ""
)

Write-Host "🔄 Rebuilding api/index.js from TypeScript source..." -ForegroundColor Cyan
npm run build:api

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Staging files..." -ForegroundColor Cyan
    git add server/api/ api/index.js
    git status --short
    
    if ($CommitMessage) {
        Write-Host ""
        Write-Host "💾 Committing with message: $CommitMessage" -ForegroundColor Cyan
        git commit -m $CommitMessage
        Write-Host "✅ Done! Run 'git push' to deploy." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  No commit message provided. Files are staged, ready to commit." -ForegroundColor Yellow
        Write-Host "   Run: git commit -m 'Your message'" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Build failed! Fix errors before committing." -ForegroundColor Red
    exit 1
}
