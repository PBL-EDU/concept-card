# Submission checklist

Prepared for publishing **Concept Card** (`id: concept-card`) to GitHub and to the Obsidian Community directory.

## 1. GitHub repository

1. Create a public repository, for example `concept-card`.
2. Fill in `authorUrl` in `manifest.json` with the repository URL (it is intentionally empty now).
3. Push this folder:

   ```bash
   git remote add origin https://github.com/<your-name>/concept-card.git
   git push -u origin main
   ```

4. Bump `manifest.json` `version` (semver, e.g. `1.7.0`), commit, then create a release with the **same tag**:

   ```bash
   git tag 1.7.0
   git push origin 1.7.0
   ```

   The included workflow `.github/workflows/release.yml` builds and attaches `main.js`, `manifest.json`, `styles.css` automatically. Without Actions, attach those three files manually.

## 2. Obsidian Community directory

1. Sign in at <https://community.obsidian.md> with an Obsidian account.
2. Link the GitHub account that owns the repository.
3. Add the plugin; the directory reads `manifest.json` at the default branch HEAD.
4. Address automated review feedback, bump version, publish a new release.
5. Once approved, search for **Concept Card** inside Obsidian.

## 3. Requirement checks

| Requirement | Status |
| --- | --- |
| `LICENSE` file (MIT) | ✅ |
| `README.md` describes purpose/usage | ✅ |
| README discloses network use and data sent | ✅ |
| `manifest.json` at repo root | ✅ |
| `id` unique and contains no "obsidian" | ✅ (`concept-card`, directory returns not found) |
| `version` is semver `x.y.z` | ✅ `1.7.0` |
| `minAppVersion` accurate | ✅ `1.4.0` |
| Description ≤250 chars, ends with `.`, no emoji | ✅ |
| `isDesktopOnly` accurate (no Node/Electron APIs) | ✅ `false` |
| Release tag equals manifest version | release workflow enforces |
| Release assets `main.js`, `manifest.json`, `styles.css` | workflow uploads |
| No telemetry / ads / self-update / obfuscation | ✅ |
| No sample code left | ✅ |
| Command IDs do not include the plugin id | ✅ |
| No internal/undocumented APIs | ✅ (Daily Notes path is now plugin settings, `{YYYY}` placeholders) |
| Source code included in repository | ✅ `src/` |

## 4. Post-publish maintenance

- Keep `versions.json` updated (`version → minAppVersion`).
- Each subsequent release: bump version, tag with the exact version, attach assets.
- Users install updates from GitHub through Obsidian; the plugin must not self-update.
- Re-check Developer policies when adding features that touch the network or files outside the vault.
