# Manual Deployment Guide

Since GitHub Actions requires billing setup, you can deploy manually using the `deploy.ps1` script.

## Quick Deploy

Simply run:
```powershell
.\deploy.ps1
```

## What the script does:

1. **Builds your Jekyll site** - Runs `bundle exec jekyll build`
2. **Prepares gh-pages branch** - Creates or checks out the gh-pages branch
3. **Copies built files** - Copies all files from `_site` to the gh-pages branch root
4. **Commits and pushes** - Commits the changes and pushes to GitHub

## After Deployment:

1. Go to your repository settings: https://github.com/ashizZz/ashizZz.github.io/settings/pages
2. Under **Source**, change from "GitHub Actions" to **"Deploy from a branch"**
3. Select:
   - **Branch:** `gh-pages`
   - **Folder:** `/` (root)
4. Click **Save**

Your site will be live at: **https://ashizZz.github.io**

## Notes:

- You'll need to run this script whenever you want to update your site
- The script automatically switches back to your `main` branch after deployment
- Make sure you have git credentials configured (GitHub CLI or SSH keys work best)

