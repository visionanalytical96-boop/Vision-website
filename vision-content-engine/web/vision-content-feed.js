/**
 * Drop-in feed widget for the existing Vision Analytical website.
 *
 * Add one container and one script tag to index.html — nothing else on the page
 * changes, and no framework or build step is involved:
 *
 *   <div id="vision-content-feed" data-endpoint="https://studio.example.in" data-limit="6"></div>
 *   <script src="/vision-content-feed.js" defer></script>
 *
 * The widget inherits the page's own CSS custom properties (--cyan, --border,
 * --surface …) so it matches the site automatically; the values below are only
 * fallbacks for pages that do not define them.
 */
(() => {
	const mount = document.getElementById('vision-content-feed');
	if (!mount) return;

	const endpoint = (mount.dataset.endpoint || '').replace(/\/+$/, '');
	const limit = Number(mount.dataset.limit) || 6;

	const style = document.createElement('style');
	style.textContent = `
		#vision-content-feed .vcf-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
		#vision-content-feed .vcf-card{border:1px solid var(--border,rgba(0,229,255,.14));border-radius:12px;overflow:hidden;
			background:var(--surface,rgba(255,255,255,.03));transition:transform .25s,border-color .25s}
		#vision-content-feed .vcf-card:hover{transform:translateY(-3px);border-color:var(--border2,rgba(0,229,255,.3))}
		#vision-content-feed .vcf-card img{width:100%;display:block;aspect-ratio:1/1;object-fit:cover;background:#05080b}
		#vision-content-feed .vcf-body{padding:12px 14px 15px}
		#vision-content-feed .vcf-title{font-weight:600;font-size:.95rem;line-height:1.3;margin:0 0 5px}
		#vision-content-feed .vcf-meta{font-size:.75rem;opacity:.6;margin:0}
		#vision-content-feed .vcf-note{opacity:.6;font-size:.9rem}
	`;
	mount.append(style);

	const grid = document.createElement('div');
	grid.className = 'vcf-grid';
	mount.append(grid);

	const note = (text) => {
		grid.innerHTML = `<p class="vcf-note">${text}</p>`;
	};

	const absolute = (url) => (url?.startsWith('http') ? url : `${endpoint}${url}`);

	fetch(`${endpoint}/api/feed?limit=${limit}`, { credentials: 'omit' })
		.then((res) => {
			if (!res.ok) throw new Error(`Feed responded ${res.status}`);
			return res.json();
		})
		.then((feed) => {
			if (!feed.items?.length) return note('No updates published yet.');
			grid.innerHTML = '';
			for (const item of feed.items) {
				const card = document.createElement('article');
				card.className = 'vcf-card';

				const img = document.createElement('img');
				img.src = absolute(item.image);
				img.alt = item.title;
				img.loading = 'lazy';
				card.append(img);

				const body = document.createElement('div');
				body.className = 'vcf-body';

				// textContent throughout — feed values are never injected as HTML.
				const title = document.createElement('p');
				title.className = 'vcf-title';
				title.textContent = item.title;
				body.append(title);

				const meta = document.createElement('p');
				meta.className = 'vcf-meta';
				meta.textContent = [item.product?.brand, item.product?.model].filter(Boolean).join(' · ');
				body.append(meta);

				card.append(body);

				if (item.product?.url) {
					const link = document.createElement('a');
					link.href = item.product.url;
					link.rel = 'noopener';
					link.style.display = 'block';
					link.append(card);
					grid.append(link);
				} else {
					grid.append(card);
				}
			}
		})
		.catch(() => note('Updates are temporarily unavailable.'));
})();
