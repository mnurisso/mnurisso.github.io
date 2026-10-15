(function () {
'use strict';
// Live repository stats from the GitHub and PyPI public APIs.
// Everything degrades silently: if a request fails (offline, rate limit) the
// cards simply keep their static content.

const TTL = 60 * 60 * 1000; // cache responses for one hour
const GH = 'https://api.github.com';

async function cachedJSON(url) {
	const key = `api:${url}`;
	try {
		const hit = JSON.parse(localStorage.getItem(key) || 'null');
		if (hit && Date.now() - hit.t < TTL) return hit.d;
	} catch { /* storage unavailable */ }

	const res = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	const data = await res.json();
	try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch { /* quota */ }
	return data;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(iso) {
	const days = Math.round((new Date(iso) - Date.now()) / 86400000);
	if (Math.abs(days) < 1) return 'today';
	if (Math.abs(days) < 45) return rtf.format(days, 'day');
	if (Math.abs(days) < 540) return rtf.format(Math.round(days / 30), 'month');
	return rtf.format(Math.round(days / 365), 'year');
}

const num = new Intl.NumberFormat('en');

function meta(card, html, title) {
	const ul = card.querySelector('.repo-meta');
	if (!ul) return;
	const li = document.createElement('li');
	li.innerHTML = html;
	if (title) li.title = title;
	ul.append(li);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function hydrate(card) {
	const repo = card.dataset.repo;
	const me = card.dataset.me;
	const pypi = card.dataset.pypi;
	const out = { commits: 0, version: null };

	const [info, contributors, pkg] = await Promise.allSettled([
		cachedJSON(`${GH}/repos/${repo}`),
		me ? cachedJSON(`${GH}/repos/${repo}/contributors?per_page=100`) : Promise.resolve(null),
		pypi ? cachedJSON(`https://pypi.org/pypi/${pypi}/json`) : Promise.resolve(null),
	]);

	const items = [];

	if (pkg.status === 'fulfilled' && pkg.value) {
		out.version = pkg.value.info.version;
		items.push([`<svg class="icon" aria-hidden="true"><use href="#i-package"/></svg><span><strong>v${esc(out.version)}</strong> on PyPI</span>`, 'Latest release on PyPI']);
	}
	if (info.status === 'fulfilled') {
		const r = info.value;
		if (r.language) items.unshift([`<span class="lang-${esc(r.language.replace(/\s+/g, '-'))}"><span class="lang-dot"></span></span><span>${esc(r.language)}</span>`]);
		items.push([`<svg class="icon" aria-hidden="true"><use href="#i-star"/></svg><span><strong>${num.format(r.stargazers_count)}</strong></span>`, 'GitHub stars']);
		if (r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION') items.push([`<span>${esc(r.license.spdx_id)}</span>`, 'License']);
	}
	if (contributors.status === 'fulfilled' && Array.isArray(contributors.value)) {
		const humans = contributors.value.filter((c) => !c.login.endsWith('[bot]'));
		const idx = humans.findIndex((c) => c.login === me);
		if (idx >= 0) {
			out.commits = humans[idx].contributions;
			const total = humans.reduce((s, c) => s + c.contributions, 0);
			const share = Math.round((100 * out.commits) / total);
			items.push([
				`<svg class="icon" aria-hidden="true"><use href="#i-users"/></svg><span><strong>${num.format(out.commits)}</strong> commits · #${idx + 1} of ${humans.length}${humans.length >= 100 ? '+' : ''}</span>`,
				`${share}% of all commits by contributors`,
			]);
		}
	}
	if (info.status === 'fulfilled' && info.value.pushed_at) {
		items.push([`<span>updated ${ago(info.value.pushed_at)}</span>`, `Last push: ${info.value.pushed_at.slice(0, 10)}`]);
	}

	card.querySelector('.repo-meta')?.replaceChildren();
	items.forEach(([html, title], i) => {
		meta(card, html, title);
		card.querySelector('.repo-meta')?.lastElementChild?.style.setProperty('animation-delay', `${i * 60}ms`);
	});

	return out;
}

/** Hydrate every `.repo[data-repo]` card; returns aggregate numbers for the page. */
async function hydrateRepos(root = document) {
	const cards = [...root.querySelectorAll('.repo[data-repo]')];
	if (!cards.length) return null;
	const results = await Promise.allSettled(cards.map(hydrate));
	const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
	return {
		commits: ok.reduce((s, r) => s + r.commits, 0),
		version: ok.find((r) => r.version)?.version ?? null,
	};
}

window.MN = window.MN || {};
window.MN.hydrateRepos = hydrateRepos;
})();
