#!/usr/bin/env python3
"""Add new journal articles from the owner's ORCID record to the Publications list.

1. Reads the public ORCID record (journal articles with a DOI only).
2. Skips every DOI already present in index.html.
3. Fetches title, authors, journal and date for the rest from Crossref.
4. Inserts one <li class="pub"> per new paper at the TOP of #pubs and bumps the static paper count.
5. Writes a Markdown summary for the pull request body.

Standard library only. Used by .github/workflows/update-papers.yml; also runnable locally:

    python3 scripts/update-papers.py [--index index.html] [--body /tmp/pr-body.md] [--dry-run]

Exit status is 0 whether or not anything changed; it prints "added=N" on the last line.
"""
import argparse
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ORCID = '0000-0002-5962-0680'
OWNER_FAMILY = 'nurisso'
CONTACT = 'matteo.nurisso@polito.it'  # Crossref "polite pool"
ASTRO_VENUES = ('monthly notices', 'astrophysical', 'astronomy & astrophysics', 'astronomy and astrophysics',
                'physical review d', 'journal of cosmology', 'universe', 'galaxies', 'astroparticle')

ARROW = '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>'


def get_json(url):
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': f'mnurisso.github.io-updater (mailto:{CONTACT})'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def orcid_dois():
    data = get_json(f'https://pub.orcid.org/v3.0/{ORCID}/works')
    found = {}
    for group in data.get('group', []):
        summary = group['work-summary'][0]
        if summary.get('type') != 'journal-article':
            continue
        for ext in group.get('external-ids', {}).get('external-id', []):
            if ext.get('external-id-type') == 'doi':
                found[ext['external-id-value'].strip().lower()] = summary['title']['title']['value']
                break
    return found


def crossref(doi):
    msg = get_json(f'https://api.crossref.org/works/{urllib.parse.quote(doi)}?mailto={CONTACT}')['message']
    clean = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
    title = clean((msg.get('title') or [''])[0])
    journal = clean((msg.get('container-title') or [''])[0])
    parts = (msg.get('published') or msg.get('published-online') or msg.get('issued') or {}).get('date-parts', [[None]])[0]
    y, m, d = (list(parts) + [None, None])[:3]
    date = '-'.join(f'{v:02d}' if i else str(v) for i, v in enumerate([y, m, d]) if v)
    people = []
    for a in msg.get('author', []):
        name = ' '.join(x for x in (a.get('given'), a.get('family')) if x) or a.get('name', '')
        if name:
            people.append((name, (a.get('family') or name).lower().startswith(OWNER_FAMILY)))
    return {'title': title, 'journal': journal, 'date': date, 'year': y, 'authors': people}


def fmt_authors(people):
    esc = lambda n, me: f'<strong>{html.escape(n)}</strong>' if me else html.escape(n)
    parts = [esc(n, me) for n, me in people]
    if len(parts) > 1:
        return ', '.join(parts[:-1]) + ', and ' + parts[-1]
    return ''.join(parts)


def topic(meta):
    j = meta['journal'].lower()
    return 'astro' if any(v in j for v in ASTRO_VENUES) else 'climate'


def citations(doi):
    """Static fallback for the citation badge (the page refreshes it live).

    Same rule as MN.hydrateCitations in assets/js/github.js: paper + preprints (Crossref has-preprint);
    OpenAlex counted once per distinct work, Crossref summed per DOI; the higher total wins.
    """
    def one(d):
        oa_id, oa, cr, pre = None, 0, 0, []
        try:
            r = get_json(f'https://api.openalex.org/works/doi:{d}?select=id,cited_by_count&mailto={CONTACT}')
            oa_id, oa = r['id'], r['cited_by_count']
        except Exception:  # noqa: BLE001
            pass
        try:
            m = get_json(f'https://api.crossref.org/works/{urllib.parse.quote(d)}?mailto={CONTACT}')['message']
            cr = m.get('is-referenced-by-count', 0)
            pre = [x['id'].lower() for x in (m.get('relation') or {}).get('has-preprint', [])]
        except Exception:  # noqa: BLE001
            pass
        return oa_id, oa, cr, pre

    oa_id, oa, cr, pre = one(doi)
    works = {oa_id: oa} if oa_id else {}
    for p in pre:
        pid, poa, pcr, _ = one(p)
        if pid and pid not in works:
            works[pid] = poa
        cr += pcr
    return max(sum(works.values()), cr)


def entry(doi, meta):
    n = citations(doi)
    hidden = '' if n else ' hidden'
    cites = (f'<span class="cites" data-doi="{doi}" title="Citations, preprints included (highest of OpenAlex and Crossref)"{hidden}>'
             f'<svg class="icon" aria-hidden="true"><use href="#i-quote"/></svg><strong>{n}</strong> citation{"" if n == 1 else "s"}</span>')
    return f'''				<li class="pub reveal" data-topic="{topic(meta)}" data-year="{meta['year']}">
					<div class="pub-meta"><span class="tag tag-ok">Published</span><span class="pub-year">{meta['date']}</span></div>
					<h3 class="pub-title">{html.escape(meta['title'])}</h3>
					<p class="pub-authors">{fmt_authors(meta['authors'])}</p>
					<p class="pub-venue"><span class="journal">{html.escape(meta['journal'])}</span> · {meta['date']}</p>
					<p class="pub-links"><a href="https://doi.org/{doi}">DOI: {doi} {ARROW}</a>{cites}</p>
				</li>
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--index', default=os.path.join(os.path.dirname(__file__), '..', 'index.html'))
    ap.add_argument('--body', default=None, help='write the PR description here when something was added')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    page = open(args.index, encoding='utf-8').read()
    known = {d.lower().rstrip('.') for d in re.findall(r'doi\.org/([^"\s<]+)', page)}
    new = {d: t for d, t in orcid_dois().items() if d not in known}
    if not new:
        print('No new journal articles in ORCID.')
        print('added=0')
        return

    entries, summary = [], []
    for doi, orcid_title in new.items():
        try:
            meta = crossref(doi)
        except Exception as e:  # noqa: BLE001
            print(f'Crossref lookup failed for {doi}: {e}', file=sys.stderr)
            continue
        if not meta['title'] or not meta['year']:
            print(f'Incomplete Crossref data for {doi}, skipped', file=sys.stderr)
            continue
        entries.append((meta['date'], entry(doi, meta)))
        summary.append(f"- **{meta['title']}** — {meta['journal']}, {meta['date']} — [{doi}](https://doi.org/{doi}) — topic guessed as `{topic(meta)}`")

    if not entries:
        print('added=0')
        return
    # newest first, all inserted at the top of the list
    block = ''.join(e for _, e in sorted(entries, reverse=True))
    marker = '<ol class="pubs" id="pubs">\n'
    if marker not in page:
        sys.exit('Could not find <ol class="pubs" id="pubs"> in index.html')
    page = page.replace(marker, marker + block, 1)
    page = re.sub(r'(data-count="pubs">)(\d+)(<)', lambda m: f'{m.group(1)}{int(m.group(2)) + len(entries)}{m.group(3)}', page, count=1)

    if not args.dry_run:
        open(args.index, 'w', encoding='utf-8').write(page)
    if args.body:
        open(args.body, 'w', encoding='utf-8').write(
            'New journal article(s) found in the ORCID record and added at the top of **Publications**:\n\n'
            + '\n'.join(summary)
            + '\n\n**Please review before merging**\n'
              '- `data-topic` (climate / astro) is guessed from the journal name.\n'
              '- Author list and title come from Crossref; fix capitalisation or accents if needed.\n'
              '- The paper counter in the hero stats was bumped automatically.\n\n'
              'Opened automatically by `.github/workflows/update-papers.yml`.\n')
    print(f'added={len(entries)}')


if __name__ == '__main__':
    main()
