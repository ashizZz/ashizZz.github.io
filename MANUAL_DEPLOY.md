# Manual Deployment Instructions

Since GitHub Actions requires billing, here's how to deploy manually:

## Option 1: Use the Deployment Script (Recommended)

1. **First, install dependencies and build:**
   ```powershell
   bundle install
   bundle exec jekyll build
   ```

2. **Then run the deployment script:**
   ```powershell
   .\deploy-simple.ps1
   ```

3. **Configure GitHub Pages:**
   - Go to: https://github.com/ashizZz/ashizZz.github.io/settings/pages
   - Under **Source**, select **"Deploy from a branch"**
   - Branch: `gh-pages`
   - Folder: `/` (root)
   - Click **Save**

## Option 2: Manual Git Commands

If the script doesn't work, you can deploy manually:

```powershell
# 1. Build the site (if not already built)
bundle exec jekyll build

# 2. Create/checkout gh-pages branch
git checkout --orphan gh-pages

# 3. Remove all files
git rm -rf .

# 4. Copy _site contents to root
# (Copy all files from _site folder to the root directory)

# 5. Add and commit
git add .
git commit -m "Deploy site"

# 6. Push to GitHub
git push origin gh-pages --force

# 7. Switch back to main
git checkout main
```

## Troubleshooting

**If you get bundler errors:**
- Run `bundle install` first
- Make sure all gems are installed

**If _site folder doesn't exist:**
- Run `bundle exec jekyll build` to generate it

**After deployment:**
- Remember to configure GitHub Pages settings to use the `gh-pages` branch
- Your site will be at: https://ashizZz.github.io

