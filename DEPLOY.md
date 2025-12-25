# 🚀 How to Deploy a New Version

We use **GitHub Actions** to automatically build and release the app for Windows, macOS, and Linux. This process runs only when a new version tag (e.g., `v1.0.1`) is pushed.

## Prerequisite
Ensure all your code changes are committed to git locally.

```bash
git add .
git commit -m "feat: added new amazing feature"
```
## Step 1: Bump the Version
Use the standard npm command to upgrade the version in package.json, create a git commit, and create a git tag all at once.

**Choose one:**
```bash
npm version patch   # 0.1.0 -> 0.1.1 (Bug fixes)
npm version minor   # 0.1.0 -> 0.2.0 (New features)
npm version major   # 0.1.0 -> 1.0.0 (Breaking changes)
```
(This command automatically updates your package.json and creates a local git tag)

## Step 2: Trigger the Build

Push the new commit and the tags to GitHub. This is the specific trigger that wakes up the build servers.

```bash
git push origin master --follow-tags
```

(Note: --follow-tags is critical. A standard git push does NOT push tags, and the build will not start.)


## Step 3: Wait & Download

1. Go to the GitHub Actions tab.
2. You will see a workflow named Build & Release running.
3. Wait approx. 10-15 minutes.
4. Once green, go to the Releases section on the right sidebar of your repository main page.
5. Your new version will be there with .exe, .dmg, and .AppImage files ready for download.