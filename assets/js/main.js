(function () {
'use strict';
const MN = window.MN || {};
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ---------- External links open in a new tab ---------- */
for (const a of $$('a[href^="http"]')) {
	if (a.hostname && a.hostname !== location.hostname) {
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
	}
}

/* ---------- Toast ---------- */
const toastEl = $('#toast');
let toastTimer;
function toast(message) {
	if (!toastEl) return;
	toastEl.textContent = message;
	toastEl.classList.add('is-visible');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
}

async function copyText(text, label = 'Copied to clipboard') {
	try {
		await navigator.clipboard.writeText(text);
		toast(label);
	} catch {
		toast('Copy failed — please copy manually');
	}
}

/* ---------- Theme ---------- */
// Dark (Solarized) is the default; the choice is remembered. See the inline script in <head>.
const currentTheme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

function setTheme(theme) {
	root.dataset.theme = theme;
	try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
	window.dispatchEvent(new Event('themechange'));
}
root.dataset.theme = currentTheme();
$('#theme-toggle')?.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));

/* ---------- Header: mobile nav, scrolled state, progress, scroll-spy ---------- */
const header = $('.site-header');
const nav = $('#nav');
const navToggle = $('#nav-toggle');
const progress = $('#scroll-progress');

function setNav(open) {
	nav.classList.toggle('is-open', open);
	navToggle.setAttribute('aria-expanded', String(open));
}
navToggle?.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.classList.contains('is-open')) setNav(false); });

let ticking = false;
function onScroll() {
	if (ticking) return;
	ticking = true;
	requestAnimationFrame(() => {
		const y = window.scrollY;
		header.classList.toggle('is-scrolled', y > 8);
		const max = document.documentElement.scrollHeight - window.innerHeight;
		if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
		ticking = false;
	});
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const spyLinks = $$('.nav a[href*="#"], .subnav a[href*="#"]').filter((a) => new URL(a.href, location.href).pathname === location.pathname);
if (spyLinks.length) {
	const byId = new Map(spyLinks.map((a) => [new URL(a.href).hash.slice(1), a]));
	const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
	const spy = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			spyLinks.forEach((a) => a.classList.remove('is-active'));
			byId.get(entry.target.id)?.classList.add('is-active');
		}
	}, { rootMargin: '-45% 0px -50% 0px' });
	sections.forEach((s) => spy.observe(s));
	// Clear the highlight while in the hero.
	const hero = $('#about');
	if (hero) new IntersectionObserver(([e]) => { if (e.isIntersecting) spyLinks.forEach((a) => a.classList.remove('is-active')); }, { rootMargin: '-40% 0px -40% 0px' }).observe(hero);
}

/* ---------- Reveal on scroll ---------- */
const revealEls = $$('.reveal');
if ('IntersectionObserver' in window && !reducedMotion) {
	const io = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
		}
	}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
	revealEls.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 50}ms`; io.observe(el); });
} else {
	revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- Hero flow field ---------- */
const flowCanvas = $('#flow-canvas');
if (flowCanvas) MN.startFlow(flowCanvas, flowCanvas.parentElement);

/* ---------- Tabs ---------- */
function selectTab(tab, focus = false) {
	const list = tab.closest('[role="tablist"]');
	$$('[role="tab"]', list).forEach((t) => {
		const selected = t === tab;
		t.setAttribute('aria-selected', String(selected));
		t.tabIndex = selected ? 0 : -1;
		const panel = document.getElementById(t.getAttribute('aria-controls'));
		if (panel) panel.hidden = !selected;
	});
	if (focus) tab.focus();
}
$$('[role="tablist"]').forEach((list) => {
	const tabs = $$('[role="tab"]', list);
	list.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) selectTab(t); });
	list.addEventListener('keydown', (e) => {
		const i = tabs.indexOf(document.activeElement);
		if (i < 0) return;
		const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
		if (e.key in keys) {
			e.preventDefault();
			selectTab(tabs[(keys[e.key] + tabs.length) % tabs.length], true);
		}
	});
});
$$('[data-open-tab]').forEach((a) => a.addEventListener('click', () => {
	const tab = $(`#tab-${a.dataset.openTab}`);
	if (tab) selectTab(tab);
}));

/* ---------- Generic filter chips ---------- */
function setupFilter(name, onChange) {
	const group = $(`[data-filter-group="${name}"]`);
	if (!group) return null;
	const chips = $$('.chip', group);
	let value = 'all';
	const api = {
		get value() { return value; },
		set(v) {
			value = v;
			chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === v)));
			onChange(v);
		},
	};
	group.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) api.set(c.dataset.filter); });
	return api;
}

/* ---------- Publications: filter + search ---------- */
const pubs = $$('#pubs .pub');
if (pubs.length) {
	const search = $('#pub-search');
	const empty = $('#pubs-empty');
	const apply = () => {
		const topic = pubFilter.value;
		const q = (search?.value || '').trim().toLowerCase();
		let shown = 0;
		for (const li of pubs) {
			const ok = (topic === 'all' || li.dataset.topic === topic) && (!q || li.textContent.toLowerCase().includes(q));
			li.hidden = !ok;
			if (ok) { shown++; li.classList.add('is-visible'); }
		}
		empty.hidden = shown > 0;
	};
	var pubFilter = setupFilter('pubs', apply);
	search?.addEventListener('input', apply);
	$$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => pubFilter.set(a.dataset.filterLink)));
}

/* ---------- Events: filter by type, year gutter ---------- */
const events = $$('#events-list .event');
if (events.length) {
	for (const key of ['all', 'conference', 'talk', 'workshop']) {
		const n = key === 'all' ? events.length : events.filter((e) => e.dataset.type === key).length;
		const badge = $(`[data-count-for="${key}"]`);
		if (badge) badge.textContent = n;
	}
	const applyEvents = (type) => {
		let lastYear = null;
		for (const li of events) {
			const ok = type === 'all' || li.dataset.type === type;
			li.hidden = !ok;
			if (!ok) continue;
			li.classList.toggle('repeat', li.dataset.year === lastYear);
			lastYear = li.dataset.year;
		}
	};
	setupFilter('events', applyEvents);
	applyEvents('all');
}

/* ---------- Software projects filter ---------- */
const projectCards = $$('#projects-grid > .card');
if (projectCards.length) {
	const empty = $('#projects-empty');
	setupFilter('projects', (kind) => {
		let shown = 0;
		for (const card of projectCards) {
			const ok = kind === 'all' || card.dataset.kind === kind;
			card.hidden = !ok;
			if (ok) shown++;
		}
		empty.hidden = shown > 0;
	});
}

/* ---------- Counters ---------- */
function countUp(el, target) {
	if (reducedMotion || target === 0) { el.textContent = target; return; }
	const duration = 900;
	const start = performance.now();
	const tick = (now) => {
		const p = Math.min(1, (now - start) / duration);
		el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
		if (p < 1) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}
function counterTarget(el) {
	const key = el.dataset.count;
	if (key === 'pubs') return $$('#pubs .pub').length;
	if (key === 'years') return new Date().getFullYear() - Number(el.dataset.since);
	if (key === 'active') return $$('[data-kind="active"]').length;
	return $$(`#events-list .event[data-type="${key}"]`).length;
}
const counters = $$('[data-count]');
if (counters.length && 'IntersectionObserver' in window) {
	const io = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			countUp(entry.target, counterTarget(entry.target));
			io.unobserve(entry.target);
		}
	}, { threshold: 0.6 });
	// HTML carries the real numbers (for no-JS); animate up from zero once JS runs.
	if (!reducedMotion) counters.forEach((el) => { el.textContent = '0'; });
	counters.forEach((el) => io.observe(el));
}

/* ---------- Live GitHub / PyPI data ---------- */
MN.hydrateRepos().then((stats) => {
	if (!stats) return;
	const commits = $('[data-live="commits"]');
	if (commits && stats.commits) countUp(commits, stats.commits);
	const version = $('[data-live="version"]');
	if (version && stats.version) version.textContent = `v${stats.version}`;
	// Cards changed height: refresh scroll-linked UI.
	onScroll();
}).catch(() => { /* stay static */ });

/* ---------- Copy buttons ---------- */
$$('[data-copy]').forEach((btn) => btn.addEventListener('click', () => {
	const code = btn.closest('.code')?.querySelector('code');
	if (code) copyText(code.textContent, 'Command copied');
}));
$('#copy-email')?.addEventListener('click', () => copyText($('#email-link').textContent.trim(), 'Email address copied'));

/* ---------- Lightbox ---------- */
const lightbox = $('#lightbox');
if (lightbox) {
	const big = $('#lightbox-img');
	$$('[data-zoom]').forEach((btn) => btn.addEventListener('click', () => {
		const img = $('img', btn);
		big.src = img.currentSrc || img.src;
		big.alt = img.alt;
		lightbox.showModal();
	}));
	lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === big) lightbox.close(); });
}

/* ---------- Command palette ---------- */
const palette = $('#palette');
if (palette) {
	const input = $('#palette-q');
	const list = $('#palette-list');
	const onIndex = location.pathname.endsWith('/') || location.pathname.endsWith('index.html');
	const go = (page, hash) => () => {
		const samePage = (page === 'index.html' && onIndex) || location.pathname.endsWith(page);
		if (samePage && hash) location.hash = hash;
		else if (samePage) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
		else location.href = page + (hash ? `#${hash}` : '');
	};
	const commands = [
		{ label: 'Home', hint: 'Go to', icon: 'book', run: go('index.html') },
		{ label: 'About me', hint: 'Go to', icon: 'users', run: go('index.html', 'bio') },
		{ label: 'Research', hint: 'Go to', icon: 'book', run: go('index.html', 'research') },
		{ label: 'Publications', hint: 'Go to', icon: 'book', run: go('index.html', 'publications') },
		{ label: 'Scientific software', hint: 'Go to', icon: 'package', run: go('software.html') },
		{ label: 'AQUA', hint: 'Software', icon: 'package', run: go('software.html', 'aqua') },
		{ label: 'Career', hint: 'Go to', icon: 'book', run: go('index.html', 'career') },
		{ label: 'Talks & events', hint: 'Go to', icon: 'pin', run: go('index.html', 'events') },
		{ label: 'Outreach', hint: 'Go to', icon: 'users', run: go('index.html', 'outreach') },
		{ label: 'Contact', hint: 'Go to', icon: 'mail', run: go('index.html', 'contact') },
		{ label: 'Toggle light / dark theme', hint: 'Action', icon: 'sun', run: () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark') },
		{ label: 'Copy email address', hint: 'Action', icon: 'copy', run: () => copyText('matteo.nurisso@polito.it', 'Email address copied') },
		{ label: 'Open GitHub profile', hint: 'Link', icon: 'github', run: () => window.open('https://github.com/mnurisso/', '_blank', 'noopener') },
		{ label: 'Open LinkedIn profile', hint: 'Link', icon: 'linkedin', run: () => window.open('https://www.linkedin.com/in/matteo-nurisso/', '_blank', 'noopener') },
	];
	let visible = commands;
	let active = 0;

	const render = () => {
		if (!visible.length) {
			list.innerHTML = '<li class="palette-empty" role="presentation">No matching commands</li>';
			return;
		}
		list.innerHTML = visible.map((c, i) =>
			`<li role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i === active}"><svg class="icon" aria-hidden="true"><use href="#i-${c.icon}"/></svg><span>${c.label}</span><small>${c.hint}</small></li>`
		).join('');
		input.setAttribute('aria-activedescendant', `cmd-${active}`);
		$(`#cmd-${active}`, list)?.scrollIntoView({ block: 'nearest' });
	};
	const filter = () => {
		const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
		visible = commands.filter((c) => terms.every((t) => `${c.label} ${c.hint}`.toLowerCase().includes(t)));
		active = 0;
		render();
	};
	const run = (i) => {
		const cmd = visible[i];
		if (!cmd) return;
		palette.close();
		setTimeout(cmd.run, 0);
	};
	const open = () => { input.value = ''; filter(); palette.showModal(); input.focus(); };

	$('#palette-open')?.addEventListener('click', open);
	document.addEventListener('keydown', (e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : open(); }
	});
	input.addEventListener('input', filter);
	input.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(visible.length, 1); render(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + visible.length) % Math.max(visible.length, 1); render(); }
		else if (e.key === 'Enter') { e.preventDefault(); run(active); }
	});
	list.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) run(Number(li.dataset.i)); });
	list.addEventListener('mousemove', (e) => {
		const li = e.target.closest('li[data-i]');
		if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); $$('li', list).forEach((el, i) => el.setAttribute('aria-selected', String(i === active))); }
	});
	palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
}

/* ---------- Deep link: #astrophysics opens the legacy research tab ---------- */
function handleHash() {
	if (location.hash === '#astrophysics') {
		const tab = $('#tab-astro');
		if (tab) { selectTab(tab); $('#research')?.scrollIntoView(); }
	}
}
window.addEventListener('hashchange', handleHash);
handleHash();

/* ---------- Footer year ---------- */
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

window.__mnReady = true;
})();
