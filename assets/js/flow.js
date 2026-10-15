(function () {
'use strict';
// Interactive flow-field background for the hero.
// Particles advect through a smooth, slowly evolving vector field (a nod to
// climate model winds / plasma flows) and swirl around the pointer.


function cssVar(name, fallback) {
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

/** Smooth pseudo-noise angle from a few superposed waves. */
function fieldAngle(x, y, t) {
	return (
		Math.sin(x * 0.0021 + t * 0.12) * 1.6 +
		Math.cos(y * 0.0027 - t * 0.09) * 1.5 +
		Math.sin((x + y) * 0.0013 + t * 0.07) * 1.2
	);
}

function startFlow(canvas, host = canvas.parentElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return () => {};

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let w = 0, h = 0, dpr = 1;
	let particles = [];
	let raf = 0;
	let running = false;
	let visible = true;
	let t = 0;
	const pointer = { x: -9999, y: -9999, active: false };
	let colors = { a: '#0a7a74', b: '#b0701d' };

	const readColors = () => {
		colors = { a: cssVar('--accent', '#0a7a74'), b: cssVar('--warm', '#b0701d') };
	};

	const spawn = (p = {}) => {
		p.x = Math.random() * w;
		p.y = Math.random() * h;
		p.px = p.x;
		p.py = p.y;
		p.life = 80 + Math.random() * 220;
		p.warm = Math.random() < 0.34;
		return p;
	};

	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		w = Math.max(1, Math.round(rect.width));
		h = Math.max(1, Math.round(rect.height));
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const count = Math.min(260, Math.round((w * h) / 5500));
		particles = Array.from({ length: count }, () => spawn());
	};

	const step = (fade) => {
		if (fade) {
			ctx.globalCompositeOperation = 'destination-out';
			ctx.fillStyle = 'rgba(0,0,0,0.045)';
			ctx.fillRect(0, 0, w, h);
			ctx.globalCompositeOperation = 'source-over';
		}
		ctx.lineWidth = 1.3;
		ctx.lineCap = 'round';
		ctx.globalAlpha = 0.6;

		for (const warm of [false, true]) {
			ctx.strokeStyle = warm ? colors.b : colors.a;
			ctx.beginPath();
			for (const p of particles) {
				if (p.warm !== warm) continue;
				const a = fieldAngle(p.x, p.y, t);
				let vx = Math.cos(a) * 1.15;
				let vy = Math.sin(a) * 1.15;

				if (pointer.active) {
					const dx = p.x - pointer.x;
					const dy = p.y - pointer.y;
					const d = Math.hypot(dx, dy);
					const R = 190;
					if (d < R && d > 0.5) {
						const k = (1 - d / R) ** 2;
						// tangential swirl + slight outward push
						vx += (-dy / d) * k * 5 + (dx / d) * k * 1.4;
						vy += (dx / d) * k * 5 + (dy / d) * k * 1.4;
					}
				}

				p.px = p.x;
				p.py = p.y;
				p.x += vx;
				p.y += vy;
				p.life -= 1;

				ctx.moveTo(p.px, p.py);
				ctx.lineTo(p.x, p.y);

				if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) spawn(p);
			}
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		t += 0.016;
	};

	const loop = () => {
		if (!running) return;
		step(true);
		raf = requestAnimationFrame(loop);
	};

	const start = () => {
		if (running || reduced || !visible || document.hidden) return;
		running = true;
		raf = requestAnimationFrame(loop);
	};
	const stop = () => {
		running = false;
		cancelAnimationFrame(raf);
	};

	// Static render for reduced-motion users: integrate for a while without fading.
	const renderStatic = () => {
		ctx.clearRect(0, 0, w, h);
		for (let i = 0; i < 120; i++) step(false);
	};

	const onMove = (e) => {
		const rect = canvas.getBoundingClientRect();
		pointer.x = e.clientX - rect.left;
		pointer.y = e.clientY - rect.top;
		pointer.active = pointer.y >= -40 && pointer.y <= rect.height + 40;
	};
	const onLeave = () => { pointer.active = false; };

	readColors();
	resize();
	if (reduced) renderStatic(); else start();

	const ro = new ResizeObserver(() => { resize(); if (reduced) renderStatic(); });
	ro.observe(canvas);
	const io = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		visible ? start() : stop();
	});
	io.observe(host);

	const onVisibility = () => (document.hidden ? stop() : start());
	const onTheme = () => { readColors(); if (reduced) renderStatic(); };

	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener('themechange', onTheme);
	host.addEventListener('pointermove', onMove, { passive: true });
	host.addEventListener('pointerleave', onLeave);

	return () => {
		stop();
		ro.disconnect();
		io.disconnect();
		document.removeEventListener('visibilitychange', onVisibility);
		window.removeEventListener('themechange', onTheme);
		host.removeEventListener('pointermove', onMove);
		host.removeEventListener('pointerleave', onLeave);
	};
}

window.MN = window.MN || {};
window.MN.startFlow = startFlow;
})();
