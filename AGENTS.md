# AGENTS.md — mnurisso.github.io

Personal site of **Matteo Nurisso** (climate scientist, Researcher at Politecnico di Torino; main developer of
[AQUA](https://github.com/DestinE-Climate-DT/AQUA)). Served as-is by **GitHub Pages**. This file is the project memory:
read it before changing anything, and update it when you change a convention.

## 1. What this is

- A static site: **plain HTML + CSS + classic (non-module) JavaScript. No build step, no dependencies, no framework.**
  Keep it that way: the owner wants a site that stays easy to edit and that works from any web server *and* when
  `index.html` is opened from disk.
- Two real pages plus redirect stubs:

| File | Purpose |
|---|---|
| `index.html` | Single-page site: hero, about, research (tabs: climate / legacy astrophysics), publications, software teaser, career, talks & events, outreach, contact |
| `software.html` | Scientific software: AQUA, AQUA diagnostics, ecosystem diagram, evaluation charts, projects grid, stack |
| `publications.html`, `scientific_interests.html`, `workshops_conferences.html`, `outreach.html`, `astrophysics.html` | Tiny **redirect stubs** to the matching section of `index.html` (old URLs keep working). Do not turn them back into pages. `astrophysics.html` → `index.html#astrophysics`, which `main.js` resolves by opening the astrophysics tab |
| `assets/css/style.css` | All styling: Solarized tokens, layout, components |
| `assets/js/main.js` | UI behaviour (theme, nav, tabs, filters, counters, palette, lightbox, copy buttons…) |
| `assets/js/flow.js` | Interactive flow-field canvas in the hero |
| `assets/js/github.js` | Live GitHub / PyPI numbers |
| `assets/favicon.svg` | AQUA water-drop favicon (hand-drawn; no official logo file exists in the AQUA repo) |
| `images/` | Optimised **WebP** images only (plus an unused `aqua_poster.png` kept from the old site) |
| `scripts/check-links.py` | Link/id/icon checker (see §7) |
| `scripts/og-image.svg` | Source of `images/og-image.jpg` (1200×630 link-preview image). Regenerate on macOS: `qlmanage -t -s 1200 -o out scripts/og-image.svg`, then `sips -c 630 1200 out/og-image.svg.png --out x.png` and convert to JPEG (the SVG has its content centred in a square canvas because `sips` centre-crops) |
| `scripts/update-papers.py` | Reads the owner's ORCID, finds journal articles missing from `index.html`, inserts them at the top of `#pubs` (metadata from Crossref) and bumps the paper counter |
| `.github/workflows/update-papers.yml` | Weekly (Mon 05:17 UTC) + manual run of the script; force-pushes branch `auto/new-papers` and opens/updates a PR for the owner to review |

- The site replaced the HTML5 UP "Solid State" template (jQuery, Sass, Font Awesome). All of that was deleted on purpose.
  Do not reintroduce any of it.

## 2. Hard rules (decisions already made by the owner)

1. **Content first.** The text of the original site was preserved (only obvious typos fixed). Never invent facts about
   the owner: roles, numbers, affiliations, collaborations, papers. If something is not in the repo, in the owner's
   messages, or verifiable from a public source (GitHub/PyPI/ORCID/DOI), ask or leave it out.
2. **Dark Solarized by default**, Solarized light as the toggle. Default is dark regardless of the OS setting;
   the choice is remembered in `localStorage["theme"]`.
3. **Plain static, classic scripts.** No ES modules (they break under `file://`), no bundlers, no CDN scripts, no web
   fonts (system font stacks), no analytics.
4. **No random scientific plots as decoration.** Imagery must be tasteful: the owner's photo, the AQUA workflow
   diagram, the precipitation map, the ClimateDT globes visual. Credit third-party images in captions.
5. Software page content decisions: `ocp-tool` and `ece-catalogue` are **removed**; `programming_notes` is **not** on the
   home page (it stays only on the software page under "Notes"); AQUA-diagnostics role = **Main contributor**;
   AQUA role = **Main developer**; Climate-DT-catalog = **Main contributor**; smmregrid and ECmean4 = **Contributor**.
6. **Do not suggest `pip install aqua-diagnostics` on its own** — it does not work without the conda environment with
   AQUA core. Point to the installation steps in the repository instead.
7. Section order on `software.html`: AQUA → AQUA diagnostics → AQUA ecosystem → ClimateDT evaluation charts →
   Projects → Stack. The evaluation-charts block is **one ClimateDT image + link** (dashboard needs DESP login), not a gallery.
8. Sections alternate background (`section` / `section section-alt`); keep the alternation when inserting or moving sections.
9. Hero stats on the home page: **papers, GitHub commits (live), conferences.** Software page stats: **stars, commits,
   PRs, issues over the last 12 months** (personal, live). Do not bring back "release version"/"licence" tiles.
10. Every external link opens in a new tab (done by `main.js`; do not hand-write `target=_blank`).

11. **Citations come from OpenAlex + Crossref (highest of the two), preprints included, never ResearchGate** — ResearchGate has no public API and blocks bots.
    ORCID does not carry citation counts. Preprints are found automatically from Crossref's `has-preprint` relation and added (OpenAlex counted once per merged work, Crossref per DOI).
    `.cites[data-doi]` badges hold a static fallback and are refreshed live by `MN.hydrateCitations()`;
    a count of 0 hides the badge. `scripts/update-papers.py` writes the static count for new papers.
12. Social profiles in hero/contact/JSON-LD/palette: GitHub, LinkedIn, ORCID, ResearchGate (`researchgate.net/profile/Matteo-Nurisso`, supplied by the owner, not verifiable by bot), email.
13. **No partner logo wall** — the owner tried it and did not like it; do not add logos of institutions/projects again unless asked.
14. `#top` must point at a real in-flow element (`<span id="top">` at the start of `<body>`), **not** the fixed header — fixed elements do not scroll
    the page, which made "Back to top" and `#top` links do nothing.

## 3. Design system (`assets/css/style.css`)

- Tokens live in `:root` (dark) and `:root[data-theme="light"]`. **Only use the tokens** (`--bg`, `--bg-alt`, `--surface`,
  `--surface-2`, `--heading`, `--text`, `--muted`, `--border`, `--accent` cyan, `--warm` yellow, `--ok` green,
  `*-soft` tints, `--code-bg`, `--shadow*`). Greys are nudged lighter than canonical Solarized for WCAG AA contrast;
  re-check contrast if you change a token (text ≥ 4.5:1 on `--bg`, `--surface`).
- Headings and `<strong>` use `--heading`; body uses `--text`; secondary text `--muted`.
- Components: `.btn` (`-primary`, `-sm`, `-ghost`), `.chip` (filter), `.tag` (`-ok`, `-warn`, …), `.pill`, `.card`,
  `.feature` (+ `-flip`, `-single`), `.callout`, `.link-chip` (+ `.lc-kind`, `.lc-name`), `.timeline`, `.stats`
  (+ `-3`, `-inline`), `.cites`, `.flow`, `.tabs`/`.tablist`/`.tabpanel`, `.code`, `.subnav`.
- Typography: serif display for headings (`ui-serif…`), system sans for text, system mono for labels/code.
- Layout gotchas learned the hard way:
  - Grid columns that must shrink on phones must be `minmax(0, 1fr)`, **not** `1fr` (a `<pre>` caused horizontal overflow).
  - Mobile nav and `.nav-toggle` only apply under `html.js`; there is a deliberate **no-JS fallback** (`html:not(.js)`).
  - `.reveal` elements are only hidden when `html.js` is set; `<head>` removes the class after 3 s if `main.js` never ran.
  - Header and sub-nav use `backdrop-filter` and are sticky: anchors need `scroll-padding-top`
    (`:root:has(.subnav)` adds extra for the software page).
  - Tap targets ≥ 40 px on touch (`@media (pointer: coarse)` rules); keep that when adding buttons.
- Breakpoints in use: 1020 (header collapses to hamburger), 960, 860 (two-column → one), 760, 680, 560, 480.
- Respect `prefers-reduced-motion` (animations off, hero flow rendered once).

## 4. JavaScript behaviour (`assets/js/*.js`)

All three files are IIFEs sharing `window.MN` (`MN.startFlow`, `MN.hydrateRepos`, `MN.hydrateProfile`) and are loaded with
`defer` in this order: `flow.js`, `github.js`, `main.js`. `main.js` sets `window.__mnReady = true` at the end.

Data-attribute contracts (HTML ↔ JS). Keep them intact when editing markup:

| Markup | Behaviour |
|---|---|
| `[role=tab]` / `aria-controls` panels inside `[data-tabs]` | Tabs with arrow-key support. `[data-open-tab="climate"]` links switch tabs |
| `[data-filter-group="pubs\|events\|projects"] .chip[data-filter]` | Filter chips. Items carry `data-topic` (`climate`/`astro`) for `.pub`, `data-type` (`conference`/`talk`/`workshop`) for `.event`, `data-kind` (`active`/`contrib`/`tools`/`legacy`) for project cards |
| `.event[data-year]` | Year gutter: JS adds `.repeat` to hide the repeated year |
| `#pub-search` | Live text search over `.pub` |
| `[data-filter-link="astro"]` | Link that sets the publication filter |
| `[data-count="pubs\|conference\|talk"]` | Counters computed from the DOM and animated up from 0 |
| `[data-count-for="all\|conference\|talk\|workshop"]` | Event count badges (filled by JS from the DOM) |
| `[data-live="commits-all\|commits-year\|prs-year\|issues-year\|stars"]` | Live GitHub numbers (see below) |
| `.repo[data-repo][data-me][data-pypi][data-kind]` | Repo card hydrated with language, stars, PyPI version, licence, the owner's commit count and rank, last push. `<ul class="repo-meta">` is filled by JS |
| `[data-zoom]` button wrapping an `<img>` | Opens the lightbox `<dialog id="lightbox">` |
| `[data-copy]` inside `.code` | Copies the `<code>` text |
| `#palette`, `#palette-open` | Command palette (Ctrl/⌘ K). Commands are the `commands` array in `main.js` — add new sections/pages there |
| `.subnav a`, `.nav a[href*="#"]` | Scroll-spy (`is-active`): last section whose top passed 35 % of the viewport |

Live data (`github.js`):
- Unauthenticated GitHub API (**60 core requests/h per IP, 10 search/min**) and the PyPI JSON API; responses cached in
  `localStorage` for 1 h under keys `api:<url>`. Everything degrades silently.
- **The HTML must always carry sensible static fallbacks** for every live number (home commits `5,651`; software
  stars `66`, commits `744`, PRs `187`, issues `79`; event/paper counts). Refresh them occasionally; JS animates *from the
  static value to the live one*.
- The star total is only applied if **every** counted repo answered (rate limits would otherwise lower it).
- Personal stats use the search API: `search/commits?q=author:mnurisso`, `search/issues?q=author:mnurisso+type:pr|issue+created:>date`.
- Theme bootstrap is an inline `<script>` in each `<head>` (sets `html.js` and `data-theme` before first paint). Keep it
  identical in `index.html` and `software.html`.

## 5. Editing recipes

**Add a publication** — copy an `<li class="pub reveal" data-topic="climate|astro" data-year="YYYY">` in `index.html`
(newest first inside `#pubs`; "Under review" uses `tag-warn`, published `tag-ok`; owner's name in `<strong>`). Bump the
static `data-count="pubs"` number in `#stats`.

**Papers are partly automated.** The weekly workflow adds new ORCID *journal articles* (not preprints/conference abstracts) as a PR.
It guesses `data-topic` from the journal name and takes authors/title from Crossref, so review the PR. Requirements: repo setting
*Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"* must be on. Test locally with
`python3 scripts/update-papers.py --dry-run` (or `--index copy.html` on a copy). Papers not in ORCID (e.g. under-review preprints) are still added by hand.

**Add a talk / conference / workshop** — copy an `<li class="event" data-type data-year>` in `#events-list`, newest year
first; put the year text in `.event-year`; for a **future** event add the `data-upcoming` attribute and use `<span class="tag tag-warn">Upcoming</span>` instead of the type tag (it stays under its `data-type` filter but is not counted); when it has happened, drop `data-upcoming`, restore the type tag and bump the counts. Update the static badge counts (`data-count-for`) and the static
`data-count="conference"` tile.

**Add a software project** — copy a card in `#projects-grid` of `software.html` (`data-kind`, `data-repo="owner/name"`,
`data-me="mnurisso"`, optional `data-pypi="package"`). Role tag classes: `tag tag-ok` (main developer/contributor/author),
`tag` (contributor). To show it on the home page, add the same card (without buttons) in `#code` of `index.html`.
Update the static `data-live="stars"` fallback.

**Add a link chip** (ecosystem diagram): `<a class="link-chip"><svg…><use href="#i-…"/></svg><span class="lc-kind">PyPI</span><span class="lc-name">pkg</span></a>`.
Always label the *kind* (GitHub / PyPI / conda / Paper / Zenodo / Container / Docs) so repo and package links with the
same name stay distinguishable.

**Add an icon** — add a `<symbol id="i-name" viewBox="0 0 24 24">` with **stroke-only** paths to the sprite at the top of
**both** `index.html` and `software.html` (the sprite is duplicated; keep it in sync — the checker reports missing icons).

**Add a section** — give it an `id`, `aria-labelledby`, alternate the background class, add it to the nav/sub-nav and to
the `commands` array in `main.js`, and put `.reveal` on blocks that should fade in.

**Images** — convert to WebP, ≤ ~1000 px wide for content images, always set `width`/`height` (prevents layout shift,
which would break anchor landing positions), `loading="lazy"` except the hero portrait, and meaningful `alt` text:

```sh
sips -Z 900 input.jpg --out /tmp/x.jpg && cwebp -q 82 /tmp/x.jpg -o images/name.webp   # macOS
```

Third-party images must be credited in a `<figcaption>`. Current ones: AQUA workflow diagram (DestinE-ECMWF website),
ClimateDT simulations visual (Andreas Müller, ECMWF, destine.ecmwf.int), precipitation map (carried over from the original site; origin not documented).

**Portrait** — `images/portrait.webp`, cropped square from the owner's photo.

## 6. Reference data (verified from public sources, Oct 2026)

- ORCID: `0000-0002-5962-0680`. GitHub: `mnurisso`. LinkedIn: `matteo-nurisso`. Email: `matteo.nurisso@polito.it`.
- Location: the owner **is based in Trieste** (portrait caption, contact list, JSON-LD `homeLocation`). The employer is
  Politecnico di Torino, so the affiliation is named as such but Turin is not used as his location. Timeline entries keep
  the place of each institution (Turin for PoliTo and UniTo, Trieste for SISSA).
- AQUA core: GitHub `DestinE-Climate-DT/AQUA`, PyPI `aqua-core`, conda-forge `aqua-core`, docs `aqua.readthedocs.io`,
  Zenodo `10.5281/zenodo.14906075`, paper GMD `10.5194/gmd-19-7725-2026`, container docs `aqua.readthedocs.io/en/latest/container.html`.
- AQUA diagnostics: GitHub `DestinE-Climate-DT/AQUA-diagnostics`, PyPI `aqua-diagnostics`,
  docs `aqua-diagnostics.readthedocs.io`, Zenodo `10.5281/zenodo.17776618`. No paper yet.
- Other repos: `DestinE-Climate-DT/Climate-DT-catalog`, `jhardenberg/smmregrid` (PyPI `smmregrid`),
  `oloapinivad/ecmean` (PyPI `ecmean4`, shown as "ECmean4"), `mnurisso/programming_notes`,
  community resources `DestinE-Climate-DT/climatedt-community-resources`.
- ClimateDT user guide: `platform.destine.eu/services/documents-and-api/doc/?service_name=climate-dt-user-guide`.
- Evaluation charts dashboard: `climatedt-evaluation-charts.destine.eu` (requires DESP authentication; do not try to scrape it).
- Current numbers (static fallbacks): 7 papers, 21 conferences/hackathons, 4 talks, 5 workshops.

## 7. Verify every change

```sh
python3 scripts/check-links.py              # relative links, #ids, duplicate ids, icon sprite
python3 scripts/check-links.py --external   # also requests external URLs (expect 403 DOIs, 999 LinkedIn, 401 dashboard)
python3 -m http.server 8000                 # preview at http://127.0.0.1:8000
```

Then check, on **both pages**, at desktop width and at ~360 px:
- no horizontal overflow (`document.documentElement.scrollWidth === clientWidth`);
- every nav / sub-nav / hero link lands with the target ~80–136 px below the top;
- hamburger opens, a link click closes it;
- theme toggle works and is remembered; tabs, filters and search work; the palette opens with Ctrl/⌘ K;
- the page is still usable with JavaScript disabled;
- images have `width`/`height`; no console errors (GitHub 403 from rate limiting is expected after many reloads).

Test pitfalls (these cost time before):
- Navigating to the same URL with a different `#hash` does **not** reload the page — add a `?v=N` query to force it.
- A hidden/occluded browser pane throttles `requestAnimationFrame`: smooth scroll stalls, screenshots come out blank or
  half-painted, and the `onScroll` guard can stay stuck. Test anchors with `scroll-behavior:auto` and measure positions via JS.
- The desktop app's file preview of an `.html` is a static `data:` snapshot: JS does not run and relative links do not resolve.
  Always preview over HTTP.
- Pixel-coordinate clicks in the preview pane are unreliable when the pane resizes; click via JS (`el.click()`) or refs.
- Repeated reloads exhaust the GitHub rate limit (60/h) — card meta will be empty and numbers stay static; not a bug.

## 8. Known limitations / ideas not done

- Live numbers come from unauthenticated APIs and may be missing when rate-limited (static fallbacks cover the tiles, not the cards).
- No `og:image`, sitemap or RSS. The canonical URLs point to `https://mnurisso.github.io/`.
- The work lives on branch `modern-redesign`; merge to `master` to publish. Pages serves the repository root.
- The AQUA favicon is a drawn drop, not the official logo.
