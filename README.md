# Concept Card

Generate structured concept cards from selected text inside Obsidian, using your own OpenAI-compatible provider. Cards are filed into your vault by type, linked back to the source note, and scheduled for spaced review with optional Daily Note reminders.

Chinese documentation: [README.zh-CN.md](README.zh-CN.md)

## Features

- **Right-click → Concept Card** with two sizes: Lite (7 sections) or Full (10 sections).
- **Fixed card skeleton** instead of free-form AI output: definition, examples, boundaries, background, confusions, perspectives, connections, self-test.
- **Two reflection sections** ("My view", "Meaning & action") are left blank with fixed questions. The model never writes personal opinions.
- **Source attribution** per section: from the text, common knowledge, or AI inference.
- **Smart filing**: vault root or a configured root folder, automatic subfolder matching, explicit per-type folders, and an optional extra AI pass that picks a child folder.
- **Bidirectional links**: the source note gets `[[Card]]` at the extracted keyword (reading view supported).
- **Duplicate protection**: vault-wide lookup by filename, `title`, and `aliases`.
- **Lifecycle**: `card_format`, `stage` (seedling/growing/evergreen), `revisit`, source list.
- **Review panel**: sidebar list of scheduled cards with "Reviewed" and "Evergreen" actions.
- **Daily Note reminders**: upcoming reviews are written into the Daily Note of the review date (idempotent block).

## Requirements

- Obsidian **1.7.2** or newer (desktop or mobile; no Node/Electron APIs are used).
- An OpenAI-compatible chat completions endpoint: OpenAI, DeepSeek, Ollama (local), or a custom gateway.

## Installation

### Community directory

Once published, search for **Concept Card** in Settings → Community plugins.

### BRAT (beta / self-hosted)

1. Install and enable the **BRAT** plugin.
2. `Add Beta plugin` with your repository: `PBL-EDU/concept-card`.
3. Enable **Concept Card** in Community plugins.

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from a GitHub release and place them in:

```
<vault>/.obsidian/plugins/concept-card/
```

Then enable the plugin in Settings → Community plugins.

## Setup

Open Settings → Concept Card → **AI service**:

| Provider | Base URL | Example model |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Ollama (local) | `http://127.0.0.1:11434/v1` | `qwen2.5:7b` |
| Custom | any OpenAI-compatible gateway | per gateway docs |

Enter the API key, choose a model, and press **Test**. The key is stored only in this vault's `.obsidian/plugins/concept-card/data.json`.

## Usage

1. Select a person, theory, concept, or phrase in a note.
2. Right-click → **Generate concept card (Lite)** or **(Full)**.
3. The card is created, filed, and the source note is linked back.

Toolbar icon and command palette entries are available too. Existing cards can be opened, merged by appending, completed to Full, or marked Evergreen from the card's context menu.

### Card structure

Lite (7): definition & mechanism, examples, boundaries, confusions, my view, meaning & action, self-test.

Full (10): the above plus background, perspectives, and connections.

Frontmatter: `title`, `aliases`, `type`, `tags`, `sources`, `source_path`, `card_format`, `stage`, `created`, `updated`, `revisit`, `model`, `confidence`.

### Filing

- Root: vault root, or a configured folder, or auto-detected.
- Subfolders: explicit per-type mapping, automatic keyword matching, or an extra AI choice among child folders.
- Everything can be disabled in settings.

### Review

- Intervals per stage (default 7 / 14 / 90 days).
- Sidebar panel lists all scheduled cards; the status bar shows due / total.
- When enabled, reminders for a review date are written into that day's Daily Note (folder supports `{YYYY}`, `{MM}`, `{DD}` placeholders). The block is idempotent.

## Network use and privacy

This plugin calls **only** the endpoint you configure. When you trigger generation or completion, it sends:

- the selected text and nearby context;
- the source note's title and path;
- titles and tags of existing cards (when enabled);
- your extra instructions.

to that provider. The API key is stored locally in `data.json`. With a local Ollama endpoint, no data leaves your machine.

### Local behavior

- Reads vault **metadata and file lists** to find existing cards, folders, and review dates. This is how duplicate detection and filing work.
- Writes only when you trigger an action: generate, upgrade, review, evergreen, or Daily Note reminder.
- The **Copy** action writes the selected text to the clipboard. The plugin never reads the clipboard.

There is **no telemetry, no analytics, no ads, no self-update mechanism, and no obfuscated code**. Generated content may be inaccurate; verify facts against the source.

## Development

```bash
npm install
npm run dev        # watch
npm run build      # production bundle
npm run typecheck
node test/run.cjs            # logic tests
node test/integration.cjs    # integration tests with a mocked obsidian module
node test/render-sample.cjs lite|full
```

Source layout: `src/card.ts` (card model/rendering/upgrade), `src/prompt.ts` (prompts), `src/main.ts` (Obsidian integration), `src/review*.ts` (review panel).

## License

MIT. See [LICENSE](LICENSE).
