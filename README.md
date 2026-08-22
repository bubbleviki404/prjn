# PRJN

PRJN is a small browser-local reflection tool built around four questions:

- **Predict** — What did I expect to happen?
- **Reality** — What actually happened?
- **Judgment** — What do I think now?
- **Next** — What will I do next?

The goal is to separate expectation, result, updated judgment, and action so a review can stay short and useful.

## Current MVP

PRJN is a static React/Vite MVP for personal use. It currently provides:

- A single-entry form with optional notes.
- Six categories: `product`, `tool`, `workflow`, `learning`, `life`, and `growth`.
- A quick-add parser for `Category`, `P`, `R`, `J`, `N`, and `Note` lines. It accepts either `:` or `：`.
- A reverse-chronological local history list.
- Editing and deleting existing entries.
- JSON export for backup and JSON import for restoring entries. Existing IDs are updated when they match.
- Resizable input and history panes on desktop; mobile uses a stacked layout.

The MVP intentionally does not include accounts, cloud sync, a server database, search, complex filtering, or AI-generated summaries.

## Data and privacy boundary

Entries are stored in the current browser's IndexedDB database through Dexie. The app does not send entries to an application server or provide cloud synchronization. Data can be lost when browser storage is cleared, a different browser or device is used, or the site storage is otherwise unavailable; export JSON regularly if the records matter.

The app is a static frontend. Its stylesheet references Google Fonts for typography, with system font fallbacks if those fonts cannot be loaded. No application API or analytics integration is configured in this repository.

Imported JSON is parsed in the browser and written to the same local database. Treat exported JSON files as sensitive if they contain personal reflections.

## Run locally

Requires Node.js and npm.

```bash
npm ci
npm run dev
```

The default development URL is [http://localhost:3000](http://localhost:3000).

## Build and verify

```bash
npm run lint
npm run build
```

The production output is written to `dist/`.

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`. It builds the static site on pushes to `main` and deploys the `dist/` artifact to GitHub Pages. The workflow uses the standard GitHub Pages deployment permissions and does not require application secrets.

The Vite base path is configured as `/prjn/`, matching the project site URL:

```text
https://<github-user>.github.io/prjn/
```

## Export format

An export file has this shape:

```ts
{
  version: string;
  exportedAt: string;
  entries: PRJNEntry[];
}
```

Each entry contains `id`, `category`, `predict`, `reality`, `judgment`, `next`, optional `note`, and `createdAt`.

## Status and limits

This is a small public MVP, not a hosted production service. It has no authentication, server-side backup, migration system, or cross-device synchronization. The current implementation is intentionally narrow so the local reflection workflow remains easy to inspect and run.

This repository currently has no `LICENSE` file. Please do not assume that the code or its assets are licensed for reuse.
