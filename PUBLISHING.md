# Publishing to the VS Code Marketplace

One-time setup, then a single command to release. Run everything from the extension root
(`c-call-explorer/`).

## 0. Prerequisites

- A **GitHub repo** at `https://github.com/nothing-githb/c-call-hierarchy-references` with this code pushed to the
  **`main`** branch. The README references screenshots with **relative** paths (`assets/*.png`) — these
  ship inside the `.vsix` (so the installed extension's detail page shows them) and resolve on GitHub once
  pushed. On the **Marketplace gallery**, vsce rewrites relative image paths to absolute GitHub-raw URLs
  using the `repository` field and the branch you pass — so publish with `--githubBranch main` (step 3),
  and make sure `assets/` is committed/pushed.
- `@vscode/vsce` (already a dev dependency): `npx vsce --version`.

## 1. Create a Marketplace publisher (once)

The `publisher` in `package.json` is **`halistahasahin`** — it must match a real publisher you own.

1. Sign in at <https://marketplace.visualstudio.com/manage> with the same Microsoft/Azure account you'll
   use for the token.
2. **Create publisher** → ID `halistahasahin` (must match `package.json`).

## 2. Create an Azure DevOps Personal Access Token (once)

1. Go to <https://dev.azure.com> → User settings → **Personal access tokens** → **New Token**.
2. **Organization:** *All accessible organizations*.
3. **Scopes:** *Custom defined* → **Marketplace → Manage** (the only scope needed).
4. Copy the token (you won't see it again).

## 3. Log in and publish

```sh
npx vsce login halistahasahin                  # paste the PAT when prompted
npm run compile                                # build out/
npx vsce publish --githubBranch main         # packages + uploads 0.1.0; rewrites image paths to main
```

To cut a new version, bump it and let vsce tag it:

```sh
npx vsce publish patch --githubBranch main   # 0.1.0 -> 0.1.1 (or: minor / major / 1.2.3)
```

## 4. Verify before publishing

```sh
npx vsce package --no-dependencies   # writes c-call-hierarchy-references-<version>.vsix
npx vsce ls                          # lists exactly what ships
```

Check that the `.vsix` contains `out/`, `icons/icon.png`, `assets/*.png`, `package.json`, `readme.md`,
`changelog.md`, `LICENSE` — and **not** `src/`, `tools/`, `example*/`, `node_modules/`.

## Notes

- `assets/*.png` ship in the `.vsix` so the installed extension's detail page renders the screenshots;
  the README references them with relative paths.
- The extension icon (`icons/icon.png`, 256×256) **is** shipped — regenerate it with
  `node tools/make-icon.js` and the screenshots with `node tools/make-shots.js` (needs `sharp`).
- Marketplace strips non-badge SVG images from READMEs — keep screenshots as PNG.
