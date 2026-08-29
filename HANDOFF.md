# Employment Explorer — Lovable Transfer Handoff (BuildSpec §11)

The explorer is a self-contained feature designed to move into the
horizonsolarhub.eu Lovable project as a directory copy. Everything lives
under `src/features/employment-explorer/`, plus three shared files.

## What to copy

| Source | Target in the Lovable project |
|---|---|
| `src/features/employment-explorer/**` | same path (entire directory) |
| `src/types/survey.ts` | same path |
| `src/data/survey-data.json` | same path |
| `src/styles/tokens.css` | same path — **the single file to edit to match the live palette** |
| The `.sh-explorer` scoped base styles + `.sh-num` / `.sh-anim` / `.sh-reveal` blocks from `src/index.css` | append to the project's global stylesheet (they are scoped to `.sh-explorer` and touch nothing global) |
| The `theme.extend` block (colors / fontSize / maxWidth / borderRadius / spacing) from `tailwind.config.ts` | merge into the project's Tailwind config |

Data is imported, not fetched: `import data from '../../data/survey-data.json'`
— no network call at runtime.

## Entry point and route

Single entry component, default export, no required props:

```tsx
import EmploymentExplorer from '@/features/employment-explorer/EmploymentExplorer';
// react-router:
<Route path="/employment-explorer" element={<EmploymentExplorer />} />
```

Link it from the WP1 / Results section. It renders standalone inside any
layout; all styling is scoped to the `.sh-explorer` root (the filter drawer
portal carries the class too), and there are no global CSS resets.

## Dependencies

Beyond React: `recharts`, `lucide-react`, `clsx`, `tailwind-merge`,
`class-variance-authority`, `@radix-ui/react-dialog`,
`@radix-ui/react-checkbox`. If the host project already ships shadcn/ui,
its Radix packages satisfy the last two; the minimal `components/ui/*`
(badge, sheet, checkbox) in the feature directory can then be swapped for
the site's own shadcn imports — they are API-compatible on purpose.

## Hard rules the host must not break (§2, §7)

- No `localStorage` / `sessionStorage` / browser storage; no `<form>`
  elements; no external font CDN (system stack only).
- Filter/toggle state serialises to the URL query string — do not mount the
  explorer behind a router that strips or rewrites query params.
- §6.9 (turnover module) ships OFF via `lib/features.ts` →
  `FEATURES.turnoverModule`. It is a compile-time constant on purpose:
  flip it only after authorial clearance (Items to Confirm 4), never
  convert it to a runtime/URL toggle.
- Employer verbatim text is never rendered anywhere (§7).

## Re-running the ETL against a fresh survey export

In the source repository (ospyroglou/SolarHub):

```
npm run build:data   # reads data/C_alıs_an_Anketi__Responses_.xlsx
npm test             # 79 assertions incl. the 44/20 pilot cut-off proof
```

Copy the regenerated `src/data/survey-data.json` across. The build fails
loudly if the cut-off no longer reproduces 44 employees / 20 employers.

## Known pending items

- §6.12 Strategy Matrix renders a placeholder until the 15 recommendation
  texts are transcribed from the report PDF into the ETL.
- The hero's "Download the full report (PDF)" button is disabled pending
  the Zenodo DOI / canonical URL (Items to Confirm 7).
- Turkish UI strings await native review (Items to Confirm 6).
- SEO: the SPA does not server-render; provide a static meta block and an
  `og:image`, and flag to the site owner that a prerender/static snapshot
  is needed for indexing and LinkedIn previews (§11.8).
- Remaining build-order steps 9–11: full accessibility/keyboard pass on
  chart segments, PNG/CSV export per module, print stylesheet.
