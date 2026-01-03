# PowerShell script to deploy Jekyll site to gh-pages branch
# Usage: .\deploy.ps1

Write-Host "=== Jekyll Site Deployment to GitHub Pages ===" -ForegroundColor Cyan
Write-Host ""

# Step 0: Ensure we're on main/master branch for building
$currentBranch = git branch --show-current
if ($currentBranch -eq "gh-pages") {
    Write-Host "Currently on gh-pages branch. Switching to main..." -ForegroundColor Yellow
    git checkout main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git checkout master 2>&1 | Out-Null
    }
    $currentBranch = git branch --show-current
}

# Step 1: Build the site
Write-Host "[1/4] Building Jekyll site on $currentBranch branch..." -ForegroundColor Yellow
bundle exec jekyll build

if (-not (Test-Path "_site")) {
    Write-Host "ERROR: _site directory not found after build!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed" -ForegroundColor Green
Write-Host ""

# Step 2: Prepare gh-pages branch
Write-Host "[2/4] Preparing gh-pages branch..." -ForegroundColor Yellow

# Check if gh-pages branch exists locally
$ghPagesLocal = git branch --list gh-pages

if ($ghPagesLocal) {
    Write-Host "  Checking out existing gh-pages branch..." -ForegroundColor Gray
    git checkout gh-pages
    # Remove all files except .git
    Get-ChildItem -Path . -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne "_site" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  Creating new gh-pages branch..." -ForegroundColor Gray
    git checkout --orphan gh-pages
    git rm -rf . 2>&1 | Out-Null
}

# Step 3: Copy _site contents to root
Write-Host "[3/4] Copying built files..." -ForegroundColor Yellow

# Copy all files from _site to current directory
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

# Step 4: Add, commit, and push
Write-Host "[4/4] Committing and pushing..." -ForegroundColor Yellow
Write-Host "Staging changes..." -ForegroundColor Gray
git add -A

$stagedFiles = git diff --cached --name-only
if (-not $stagedFiles) {
    Write-Host "  No changes to commit (site is already up to date)" -ForegroundColor Yellow
} else {
    Write-Host "  Committing changes..." -ForegroundColor Gray
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Deploy site - $timestamp" 2>&1 | Out-Null
    
    Write-Host "  Pushing to GitHub..." -ForegroundColor Gray
    git push origin gh-pages --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Successfully deployed to gh-pages branch!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Go to: https://github.com/ashizZz/ashizZz.github.io/settings/pages" -ForegroundColor White
        Write-Host "  2. Under Source, select Deploy from a branch" -ForegroundColor White
        Write-Host "  3. Branch: gh-pages, Folder: / (root)" -ForegroundColor White
        Write-Host "  4. Click Save" -ForegroundColor White
        Write-Host ""
        Write-Host "Your site will be available at: https://ashizZz.github.io" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "ERROR: Failed to push to GitHub" -ForegroundColor Red
        Write-Host "Please check your git credentials and try again." -ForegroundColor Yellow
        exit 1
    }
}

# Step 5: Switch back to original branch
Write-Host ""
Write-Host "Switching back to $currentBranch branch..." -ForegroundColor Yellow
git checkout $currentBranch 2>&1 | Out-Null

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
