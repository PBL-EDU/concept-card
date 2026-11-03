# Submission status

**Repository:** <https://github.com/PBL-EDU/concept-card>
**Release:** <https://github.com/PBL-EDU/concept-card/releases/tag/1.7.2>
**Plugin id:** `concept-card`
**Manifest version:** `1.7.2`

## Review status

1.7.2 addresses the remaining lint warnings:

- `prefer-create-el`: all `createDiv` / `createSpan` calls replaced with `createEl`.
- `no-unsafe-assignment`: frontmatter values annotated as `unknown` before narrowing.
- README now discloses vault enumeration and clipboard behavior (behavior recommendations).
- Release workflow template now includes `actions/attest-build-provenance` for artifact attestations.

Still non-blocking recommendations: declarative `getSettingDefinitions()` (1.13 settings search) and the deprecated `display()` fallback. They do not affect functionality or installation.

## Already done

- [x] Public GitHub repository with `README.md`, `README.zh-CN.md`, `LICENSE`, `manifest.json`, `versions.json`, `src/`, tests.
- [x] `authorUrl` points at the organization profile.
- [x] Version `1.7.2`, tag `1.7.2` pushed, release with assets `main.js`, `manifest.json`, `styles.css` verified.
- [x] English README with a network-use / privacy disclosure.
- [x] No telemetry, ads, self-update, obfuscation, or internal APIs (`app.internalPlugins` removed).
- [x] BRAT install works with `PBL-EDU/concept-card`.

## Remaining: submit to the Obsidian Community directory

This step needs the maintainer's Obsidian account (it cannot be automated from the repository).

1. Sign in at <https://community.obsidian.md> with the Obsidian account.
2. Link the GitHub account `PBL-EDU`.
3. Add the plugin; the directory reads `manifest.json` at the `main` branch HEAD.
4. Fix any automated review findings, bump the version, publish a new release.
5. After approval, users can search for **Concept Card** inside Obsidian.

## Release workflow (optional)

The CI template lives at `docs/release-workflow.yml` because the current GitHub token lacks the `workflow` scope (GitHub rejects pushing `.github/workflows/*` with such a token).

To enable automated releases:

```bash
gh auth refresh -h github.com -s workflow
mkdir -p .github/workflows
cp docs/release-workflow.yml .github/workflows/release.yml
git add .github/workflows/release.yml
git commit -m "Add release workflow"
git push
```

Until then, publish releases manually:

```bash
gh release create <version> main.js manifest.json styles.css --verify-tag
```

The tag must equal `manifest.json` `version` exactly (`1.7.2`, not `v1.7.2`).

## Requirement checklist

| Requirement | Status |
| --- | --- |
| `LICENSE` file (MIT) | ✅ |
| `README.md` describes purpose/usage | ✅ |
| README discloses network use and data sent | ✅ |
| `manifest.json` at repository HEAD | ✅ |
| `id` unique, no "obsidian" | ✅ `concept-card` |
| `version` semver | ✅ `1.7.2` |
| `minAppVersion` accurate | ✅ `1.7.2` |
| Description ≤250 chars, ends with `.`, no emoji | ✅ |
| `isDesktopOnly` accurate (no Node/Electron APIs) | ✅ `false` |
| Release tag equals manifest version | ✅ `1.7.2` |
| Release assets present | ✅ `main.js`, `manifest.json`, `styles.css` |
| No telemetry / ads / self-update / obfuscation | ✅ |
| Command IDs do not include plugin id | ✅ |
| No internal/undocumented APIs | ✅ |
| Source included | ✅ `src/` |

## Maintenance

- Keep `versions.json` updated (`version → minAppVersion`).
- Every release: bump version, tag with the exact version, attach the three assets.
- Re-check Developer policies for network or file-access changes.
