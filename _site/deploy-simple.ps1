# Simple deployment script - uses existing _site folder
# Make sure you've built the site first: bundle exec jekyll build

Write-Host "=== Deploying to GitHub Pages ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "_site")) {
    Write-Host "ERROR: _site folder not found!" -ForegroundColor Red
    Write-Host "Please build the site first: bundle exec jekyll build" -ForegroundColor Yellow
    exit 1
}

# Ensure we're on main branch
$currentBranch = git branch --show-current
if ($currentBranch -eq "gh-pages") {
    git checkout main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git checkout master 2>&1 | Out-Null
    }
    $currentBranch = git branch --show-current
}

Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# Check if gh-pages exists
$ghPagesExists = git branch --list gh-pages
if ($ghPagesExists) {
    Write-Host "Switching to gh-pages branch..." -ForegroundColor Yellow
    git checkout gh-pages
    # Clean the branch (keep .git only)
    Get-ChildItem -Path . -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne "_site" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Creating gh-pages branch..." -ForegroundColor Yellow
    git checkout --orphan gh-pages
    git rm -rf . 2>&1 | Out-Null
}

Write-Host "Copying files from _site..." -ForegroundColor Yellow
Get-ChildItem -Path "_site" | ForEach-Object {
    $dest = Join-Path $PWD $_.Name
    if ($_.PSIsContainer) {
        if (Test-Path $dest) {
            Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
        }
        Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $dest -Force
    }
}

Write-Host "Staging changes..." -ForegroundColor Yellow
git add -A

$staged = git diff --cached --name-only
if ($staged) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Deploy site - $timestamp"
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin gh-pages --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Success! Site deployed to gh-pages branch" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next: Configure GitHub Pages:" -ForegroundColor Cyan
        Write-Host "  https://github.com/ashizZz/ashizZz.github.io/settings/pages" -ForegroundColor White
        Write-Host "  Source: Deploy from a branch" -ForegroundColor White
        Write-Host "  Branch: gh-pages, Folder: /" -ForegroundColor White
    }
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Switching back to $currentBranch..." -ForegroundColor Yellow
git checkout $currentBranch 2>&1 | Out-Null

Write-Host "Done!" -ForegroundColor Green

