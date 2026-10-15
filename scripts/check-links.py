#!/usr/bin/env python3
"""Check the site's links.

Always checks: relative files exist, #fragments exist on the target page,
duplicate ids, and every <use href="#i-..."> icon is defined in the sprite.
With --external it also requests every http(s) link (slow; needs network).

Expected noise with --external: DOIs and some publishers answer 403 to bots,
LinkedIn answers 999, the evaluation-charts dashboard answers 401 (login), and
the canonical https://mnurisso.github.io/... URLs 404 until deployed.

Usage: python3 scripts/check-links.py [--external]
"""
import concurrent.futures as cf
import glob
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
pages = sorted(p for p in glob.glob('*.html'))
sources = {p: open(p, encoding='utf-8').read() for p in pages}
ids = {p: re.findall(r'\sid="([^"]+)"', s) for p, s in sources.items()}
# Redirect stubs point at ids that index.html resolves in JS.
JS_ALIASES = {'astrophysics'}

problems, external = [], {}
for page, src in sources.items():
    seen = {}
    for i in ids[page]:
        seen[i] = seen.get(i, 0) + 1
    problems += [(page, f'duplicate id "{i}"') for i, n in seen.items() if n > 1]
    for icon in set(re.findall(r'<use href="#([^"]+)"', src)):
        if icon not in ids[page]:
            problems.append((page, f'icon #{icon} missing from sprite'))
    for url in re.findall(r'(?:href|src)="([^"]+)"', src):
        if url.startswith(('mailto:', 'data:', 'javascript:')):
            continue
        if url.startswith(('http://', 'https://')):
            external.setdefault(url, []).append(page)
            continue
        path, _, frag = url.partition('#')
        target = path or page
        if path and not os.path.exists(path):
            problems.append((page, f'missing file {url}'))
        elif frag and target in ids and frag not in ids[target] and frag not in JS_ALIASES and not path.startswith('#'):
            if not (page == target and frag.startswith('i-')):
                problems.append((page, f'missing id in {url}'))

print('Internal problems:', problems or 'none')

if '--external' in sys.argv:
    def check(url):
        base = url.split('#')[0]
        for method in ('HEAD', 'GET'):
            try:
                req = urllib.request.Request(base, method=method, headers={'User-Agent': 'Mozilla/5.0 (link check)'})
                with urllib.request.urlopen(req, timeout=15) as r:
                    return url, r.status
            except urllib.error.HTTPError as e:
                if method == 'GET' or e.code in (404, 410):
                    return url, e.code
            except Exception as e:  # noqa: BLE001
                if method == 'GET':
                    return url, f'{type(e).__name__}'
    with cf.ThreadPoolExecutor(8) as ex:
        for url, status in sorted(ex.map(check, external), key=lambda r: str(r[1])):
            if status != 200:
                print(status, url, external[url])
    print(len(external), 'external links checked')
sys.exit(1 if problems else 0)
