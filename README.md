# mnurisso.github.io

Personal site of Matteo Nurisso. Plain HTML, CSS and classic scripts — no build step, no dependencies. Works from a plain web server
and also when `index.html` is opened directly from disk.
It is served as-is by GitHub Pages.

```
index.html          single-page site (about, research, publications, career, events, outreach, contact)
software.html       scientific software page (AQUA ecosystem, live repository stats)
assets/css/style.css  Solarized design tokens (dark default, light toggle), layout, components
assets/js/main.js     theme, nav, tabs, filters, command palette (Ctrl/⌘ K), counters
assets/js/flow.js     interactive flow-field canvas in the hero
assets/js/github.js   live GitHub + PyPI stats (cached for 1 h, degrades silently)
images/               optimised WebP images
*.html (old pages)    small redirect stubs to the matching section of index.html
```

Preview locally:

```sh
python3 -m http.server 8000
```

Content lives directly in the HTML: add a publication by copying a `<li class="pub">`,
an event by copying a `<li class="event">` (set `data-type` and `data-year`).

Contributor and AI-agent documentation (conventions, design system, recipes, testing): see [`AGENTS.md`](AGENTS.md).
Check links with `python3 scripts/check-links.py`.
