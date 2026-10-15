# CLAUDE.md

@AGENTS.md

## Notes for Claude Code on this repo

- `AGENTS.md` is the single source of truth (architecture, rules, recipes, testing). Read it first and keep it updated:
  if you change a convention, a data-attribute contract, a design token or a content decision, edit `AGENTS.md` in the same change.
- Work on a branch and commit only when asked. Commit messages end with the attribution line the session instructs.
- This is a no-build static site: there is nothing to install. Preview with `python3 -m http.server 8000` and verify with
  `python3 scripts/check-links.py` (see AGENTS.md §7 for the full checklist and the browser-pane pitfalls).
- Prefer editing the existing HTML/CSS/JS over adding files or dependencies. Do not add frameworks, modules, CDN scripts or fonts.
- Ask the owner before adding claims about their career, collaborations or numbers that cannot be verified from public sources.
- When the owner reports a visual or link problem, reproduce it over HTTP at desktop and ~360 px width before fixing.
