# Frontend audit

**Checked:** 2026-10-09  
**Status:** Runnable Vite/React prototype. It is an interface scaffold, not a
connected flood-risk product.

## Current state

The frontend lives under `frontend/` and uses Vite, React 18, strict
TypeScript, Tailwind CSS, and direct MapLibre GL JS integration. It displays an
illustrative map made from in-source GeoJSON and sample route rows. The app
repeatedly labels these as placeholder data and says no real location, data
source, or risk model is connected.

There is no API client, backend integration, real locality, live data feed,
measured flood observation, or actual route calculation. `frontend/public/data/`
does not exist, and the repository has no implemented JSON/GeoJSON frontend
data contract yet.

## File inventory

| File | Current contents and purpose |
| --- | --- |
| `frontend/index.html` | Vite HTML entry, app mount point, page metadata/title, and Google Fonts stylesheet link for Source Serif 4, IBM Plex Sans, and IBM Plex Mono. |
| `frontend/package.json` | Package scripts (`dev`, `build`, `preview`); React 18, React DOM, and MapLibre runtime dependencies; TypeScript, Vite, Tailwind, PostCSS, and type packages for development. |
| `frontend/package-lock.json` | npm lockfile recording the resolved dependency tree. |
| `frontend/vite.config.ts` | Vite configuration with the React plugin. |
| `frontend/tailwind.config.ts` | Survey-map design tokens: paper, ink, muted, rule, accent, risk colors and water colors; `font-display`, `font-ui`, and `font-data` font families; scans HTML and TypeScript/TSX sources. |
| `frontend/postcss.config.js` | PostCSS plugin configuration for Tailwind and Autoprefixer. |
| `frontend/tsconfig.json` | TypeScript project references for app and tool configuration projects. |
| `frontend/tsconfig.app.json` | Strict browser-app TypeScript options, JSX transform, unused-code checks, and source inclusion. |
| `frontend/tsconfig.node.json` | TypeScript configuration for Vite and Tailwind config files. |
| `frontend/src/main.tsx` | React entry; loads app CSS and MapLibre CSS; renders the app within `React.StrictMode`. |
| `frontend/src/App.tsx` | Main page: persistent warning, placeholder disclosure, illustrative scenario selector with `aria-live`, map key, placeholder route table, and estimated-exposure language. |
| `frontend/src/FloodMap.tsx` | Direct MapLibre map component. Builds an in-memory style from placeholder features and CSS custom-property color tokens; reports initialization and map errors; removes event listener and map on cleanup. |
| `frontend/src/placeholderData.ts` | In-source placeholder line and point GeoJSON around coordinate `[0, 0]`; features are labeled in the interface as illustrative, not real locations. |
| `frontend/src/index.css` | Tailwind directives, CSS token bindings, basic global layout and selection styling. |

## Behavior and boundaries

- Scenario buttons change only local React state and screen-reader text. They do
  not change map features or calculate risk.
- The route table has two static placeholder rows and no distance, routing, or
  model-derived score.
- The map uses an inline background style and placeholder GeoJSON. It does not
  fetch basemap tiles or a backend feed.
- The persistent UI text is **“Experimental estimate. Not an official
  warning.”** Placeholder content is marked **“Placeholder data.”**
- MapLibre initialization and `error` events are surfaced in the UI and logged.
  The effect removes the map and its handler when unmounted.
- There are no test files in the frontend inventory. Validation is currently a
  TypeScript production build.

## Validation observed

Command run from `frontend/`:

```text
npm run build
✓ 31 modules transformed
✓ built in 5.96s
```

The production build succeeds. Vite warns that the minified JavaScript chunk is
about 1.19 MB, above its 500 kB advisory threshold (about 332 kB gzip).

## Missing work

- Decide and configure the target locality and map view.
- Define the exported GeoJSON/JSON contract and connect it to a real data source
  only after its provenance and semantics are documented.
- Replace placeholder map and route content with actual validated outputs.
- Add frontend tests, including accessibility and data-loading/error behavior.
- Consider code splitting MapLibre if reducing the production bundle is needed.

