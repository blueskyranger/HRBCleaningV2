# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

HRB Cleaning V2 is a static web app (no build system, no npm) deployed on GitHub Pages at `https://blueskyranger.github.io/HRBCleaningV2/`. It provides a real-time shared cleaning checklist for a church/community building, backed by Firebase Firestore.

## Running locally

Open any `.html` file directly in a browser, or use a simple static server:

```
npx serve .
# or
python -m http.server
```

Firebase anonymous auth requires the pages to be served over HTTP/HTTPS — `file://` URLs may cause CORS issues with the Firebase SDK.

## Architecture

There is no build step. All logic lives inline in each HTML file as `<script type="module">` blocks. The Firebase SDK is loaded from the CDN (`https://www.gstatic.com/firebasejs/12.9.0/...`).

### Pages and their data sources

| File | Purpose | Firebase collection |
|------|---------|---------------------|
| `index.html` | Weekly cleaning checklist | `checklists/{listId}` (default: `"default"`) |
| `stock.html` | Consumables stock tracker | `stock/current` |
| `schedule.html` | Team roster calendar view | none (reads `schedule-data.js`) |
| `aircon.html` | A/C service dates | none (static HTML) |

### `schedule-data.js`

The single source of truth for the cleaning roster. Both `index.html` (team banner) and `schedule.html` (full table) import from this ES module. To update the schedule, edit only this file.

### Firebase patterns

- **Anonymous auth** is used on every page that talks to Firestore. All Firestore rules must allow authenticated anonymous users to read and write.
- The `applyingRemoteState` boolean flag prevents echo writes: it is set to `true` while applying an `onSnapshot` update so that checkbox/select `change` listeners skip their Firestore write.
- Checklist state is stored as a flat map under `state` (e.g. `state["foyer-mop"] = true`). Individual fields are updated with dot-notation keys (`state.foyer-mop`) to avoid overwriting sibling fields.
- The checklist supports multiple independent lists via the `?list=<id>` query parameter.
- "Save & Clear" writes a weekly snapshot to `reports/{YYYY-MM-DD}` before clearing, and a 10-second undo window delays the Firestore clear.

### Firestore collections

- `checklists/{listId}` — `{ state: {[dataId]: boolean}, updatedAt: Timestamp }`
- `reports/{weekEnding}` — `{ weekEnding, savedAt, state, totalTasks, completedTasks, completedPercent }`
- `stock/current` — `{ items: {[dataId]: string}, updatedAt: Timestamp }`

## Key conventions

- Checkbox and select `data-id` attributes are the Firestore field keys. Keep them stable — renaming one loses its saved state.
- Low-stock threshold for each stock item is set via `data-low` on the `<select>` element.
- Dates in `schedule-data.js` use `YYYY-MM-DD` ISO format for sorting; `schedule.html` reformats them to `DD-MM-YYYY` for display.
- All Firebase config (API key etc.) is intentionally public — it is a client-side web app and the keys are restricted by Firebase security rules and domain allowlists, not kept secret.
