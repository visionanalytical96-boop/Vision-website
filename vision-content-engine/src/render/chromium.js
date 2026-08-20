/**
 * Headless Chromium driver over the DevTools Protocol.
 *
 * Chromium is used purely as a CPU rasteriser and text-metrics oracle — there is
 * no GPU requirement and no model of any kind involved. It is spoken to directly
 * over CDP so the engine carries no npm dependencies.
 */
import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../config/env.js';

// Ordered by reliability for headless server use, not alphabetically.
//
// Snap-packaged Chromium is listed last: it runs under confinement with its own
// private /tmp, so it cannot see the temporary profile directory this module
// creates and the launch times out. On Ubuntu `/usr/bin/chromium-browser` is a
// wrapper around that snap, so it has to rank below the real .deb browsers —
// otherwise installing Chrome alongside it changes nothing.
const CANDIDATE_BINARIES = [
	process.env.CONTENT_ENGINE_CHROMIUM,
	process.env.CHROME_PATH,
	'/usr/bin/google-chrome-stable',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/usr/bin/chromium-browser',
	'/snap/bin/chromium',
];

/** Playwright-managed browsers, when present, are preferred and pinned. */
function playwrightBinaries() {
	const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
	if (!existsSync(root)) return [];
	const found = [];
	let entries = [];
	try {
		entries = readdirSync(root);
	} catch {
		return [];
	}
	// headless_shell is lighter than full chrome; prefer it.
	for (const entry of entries.filter((e) => e.includes('headless_shell')).concat(entries.filter((e) => !e.includes('headless_shell')))) {
		for (const rel of ['chrome-linux/headless_shell', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
			const candidate = join(root, entry, rel);
			if (existsSync(candidate)) found.push(candidate);
		}
	}
	return found;
}

export function findChromium() {
	if (config.render.chromiumPath && isExecutable(config.render.chromiumPath)) return config.render.chromiumPath;
	for (const candidate of [...playwrightBinaries(), ...CANDIDATE_BINARIES]) {
		if (candidate && isExecutable(candidate)) return candidate;
	}
	return null;
}

function isExecutable(path) {
	try {
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Where to put the throwaway browser profile.
 *
 * Not /tmp: a snap-confined browser gets a private /tmp and cannot see a
 * directory created there by this process, so the launch hangs. A directory
 * under the user's home is visible to both confined and unconfined builds.
 */
function profileRoot() {
	const root = join(homedir(), '.cache', 'vision-content-engine');
	try {
		mkdirSync(root, { recursive: true });
		sweepStaleProfiles(root);
		return root;
	} catch {
		return tmpdir();
	}
}

/** Removes profiles left behind by a crash or an interrupted shutdown. */
function sweepStaleProfiles(root) {
	try {
		for (const entry of readdirSync(root)) {
			if (!entry.startsWith('vce-chromium-') && !entry.startsWith('probe-')) continue;
			rmSync(join(root, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
		}
	} catch {
		/* housekeeping only */
	}
}

class ChromiumSession {
	constructor(binary) {
		this.binary = binary;
		this.proc = null;
		this.ws = null;
		this.nextId = 0;
		this.pending = new Map();
		this.userDataDir = null;
		this.starting = null;
	}

	async start() {
		if (this.ws && this.ws.readyState === 1) return;
		if (this.starting) return this.starting;
		this.starting = this.#launch().finally(() => {
			this.starting = null;
		});
		return this.starting;
	}

	async #launch() {
		this.userDataDir = mkdtempSync(join(profileRoot(), 'vce-chromium-'));
		this.proc = spawn(
			this.binary,
			[
				'--headless',
				'--disable-gpu',
				'--no-sandbox',
				'--disable-dev-shm-usage',
				'--hide-scrollbars',
				'--mute-audio',
				'--no-first-run',
				'--disable-extensions',
				'--force-color-profile=srgb',
				'--font-render-hinting=none',
				'--remote-debugging-port=0',
				`--user-data-dir=${this.userDataDir}`,
				'about:blank',
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);

		this.proc.once('exit', () => {
			this.ws = null;
			this.proc = null;
		});

		const wsUrl = await new Promise((resolve, reject) => {
			let buffer = '';
			const timer = setTimeout(
				() =>
					reject(
						new Error(
							`Timed out waiting for Chromium to start (${this.binary}). ` +
								'A snap-packaged browser cannot be driven this way — install the Chrome or Chromium .deb, ' +
								'or set CONTENT_ENGINE_CHROMIUM to an unconfined binary.',
						),
					),
				config.render.timeoutMs,
			);
			this.proc.stderr.on('data', (chunk) => {
				buffer += chunk.toString();
				const match = buffer.match(/ws:\/\/[^\s]+/);
				if (match) {
					clearTimeout(timer);
					resolve(match[0]);
				}
			});
			this.proc.once('error', (err) => {
				clearTimeout(timer);
				reject(err);
			});
		});

		this.ws = new WebSocket(wsUrl);
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('Timed out connecting to Chromium')), config.render.timeoutMs);
			this.ws.addEventListener('open', () => {
				clearTimeout(timer);
				resolve();
			});
			this.ws.addEventListener('error', () => {
				clearTimeout(timer);
				reject(new Error('Failed to connect to Chromium DevTools'));
			});
		});

		this.ws.addEventListener('message', (event) => {
			let message;
			try {
				message = JSON.parse(event.data);
			} catch {
				return;
			}
			const handler = message.id ? this.pending.get(message.id) : null;
			if (handler) {
				this.pending.delete(message.id);
				handler(message);
			}
		});

		this.ws.addEventListener('close', () => {
			for (const handler of this.pending.values()) {
				handler({ error: { message: 'Chromium connection closed' } });
			}
			this.pending.clear();
			this.ws = null;
		});
	}

	send(method, params = {}, sessionId) {
		if (!this.ws || this.ws.readyState !== 1) {
			return Promise.reject(new Error('Chromium is not connected'));
		}
		const id = ++this.nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP timeout: ${method}`));
			}, config.render.timeoutMs);
			this.pending.set(id, (message) => {
				clearTimeout(timer);
				if (message.error) reject(new Error(`${method}: ${message.error.message}`));
				else resolve(message.result);
			});
			this.ws.send(JSON.stringify({ id, method, params, sessionId }));
		});
	}

	/**
	 * Renders SVG markup and returns the encoded image plus text measurements.
	 *
	 * @param {string} svg
	 * @param {{width:number,height:number,format:string,quality?:number,measure?:boolean}} opts
	 */
	async render(svg, { width, height, format = 'png', quality, measure = true }) {
		await this.start();
		const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
		let sessionId;
		try {
			({ sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true }));
			const call = (method, params) => this.send(method, params, sessionId);

			await call('Page.enable');
			await call('Emulation.setDeviceMetricsOverride', {
				width,
				height,
				deviceScaleFactor: 1,
				mobile: false,
			});
			// Without this the compositor paints opaque white behind the page, so
			// any transparency in the source is lost. Poster templates paint their
			// own background, so this only affects genuinely transparent output.
			await call('Emulation.setDefaultBackgroundColorOverride', {
				color: { r: 0, g: 0, b: 0, a: 0 },
			}).catch(() => {});

			const html =
				'<!doctype html><meta charset="utf-8">' +
				'<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block}</style>' +
				svg;

			// Content is set through the protocol rather than a data: URL so that
			// very large embedded assets do not hit URL length limits.
			const { frameTree } = await call('Page.getFrameTree');
			await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
			await call('Runtime.enable');
			await this.#waitForFonts(call);

			const measurements = measure ? await this.#measure(call, { width, height }) : null;

			const screenshot = await call('Page.captureScreenshot', {
				format,
				...(format === 'png' ? {} : { quality: quality ?? 90 }),
				captureBeyondViewport: false,
				optimizeForSpeed: false,
			});

			return { buffer: Buffer.from(screenshot.data, 'base64'), measurements };
		} finally {
			await this.send('Target.closeTarget', { targetId }).catch(() => {});
		}
	}

	/**
	 * Renders HTML to a print-ready PDF.
	 *
	 * Documents are HTML rather than SVG because they have flowing text, tables
	 * and page breaks — things a fixed-viewBox SVG cannot do. Chromium's own
	 * print pipeline handles pagination, so multi-page output needs no extra
	 * dependency and margins come from the stylesheet's @page rule.
	 *
	 * @param {string} html
	 * @param {{landscape?:boolean, scale?:number}} [opts]
	 * @returns {Promise<Buffer>}
	 */
	async renderPdf(html, { landscape = false, scale = 1 } = {}) {
		await this.start();
		const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
		try {
			const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
			const call = (method, params) => this.send(method, params, sessionId);

			await call('Page.enable');
			const { frameTree } = await call('Page.getFrameTree');
			await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
			await call('Runtime.enable');
			await this.#waitForFonts(call);

			const result = await call('Page.printToPDF', {
				// A4 in inches; margins are left to the document's own @page rule.
				paperWidth: 8.27,
				paperHeight: 11.69,
				marginTop: 0,
				marginBottom: 0,
				marginLeft: 0,
				marginRight: 0,
				printBackground: true,
				preferCSSPageSize: true,
				landscape,
				scale,
			});
			return Buffer.from(result.data, 'base64');
		} finally {
			await this.send('Target.closeTarget', { targetId }).catch(() => {});
		}
	}

	/**
	 * Loads markup and evaluates an expression against it, waiting for embedded
	 * fonts first. Used by font calibration; not part of the render path.
	 *
	 * @param {string} markup     SVG or HTML to load
	 * @param {string} expression JS expression returning a serialisable value
	 */
	async evaluate(markup, expression) {
		await this.start();
		const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
		try {
			const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
			const call = (method, params) => this.send(method, params, sessionId);
			await call('Page.enable');
			await call('Runtime.enable');
			const { frameTree } = await call('Page.getFrameTree');
			await call('Page.setDocumentContent', {
				frameId: frameTree.frame.id,
				html: `<!doctype html><meta charset="utf-8">${markup}`,
			});
			await this.#waitForFonts(call);
			const result = await call('Runtime.evaluate', {
				expression,
				returnByValue: true,
				awaitPromise: true,
			});
			if (result.exceptionDetails) {
				throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
			}
			return result.result.value;
		} finally {
			await this.send('Target.closeTarget', { targetId }).catch(() => {});
		}
	}

	async #waitForFonts(call) {
		// document.fonts.ready resolves once embedded @font-face data is parsed;
		// screenshotting before that yields fallback metrics.
		await call('Runtime.evaluate', {
			expression: 'document.fonts ? document.fonts.ready.then(() => true) : true',
			awaitPromise: true,
			returnByValue: true,
		}).catch(() => {});
	}

	/** Collects real rendered geometry for the quality checks. */
	async #measure(call, { width, height }) {
		const expression = `(() => {
			const results = [];
			for (const node of document.querySelectorAll('[data-role]')) {
				let box;
				try { box = node.getBBox(); } catch { continue; }
				results.push({
					role: node.getAttribute('data-role'),
					text: (node.textContent || '').slice(0, 80),
					x: box.x, y: box.y, width: box.width, height: box.height,
					fitW: node.hasAttribute('data-fit-w') ? parseFloat(node.getAttribute('data-fit-w')) : null,
					fitH: node.hasAttribute('data-fit-h') ? parseFloat(node.getAttribute('data-fit-h')) : null,
				});
			}
			return JSON.stringify({ canvas: { width: ${width}, height: ${height} }, nodes: results });
		})()`;
		const result = await call('Runtime.evaluate', { expression, returnByValue: true });
		try {
			return JSON.parse(result.result.value);
		} catch {
			return null;
		}
	}

	async close() {
		try {
			this.ws?.close();
		} catch {
			/* already gone */
		}
		this.proc?.kill();
		this.proc = null;
		this.ws = null;

		if (this.userDataDir) {
			const dir = this.userDataDir;
			this.userDataDir = null;
			// The browser is still flushing its profile as it exits, so deleting
			// immediately races it and throws ENOTEMPTY. Retry briefly, and never
			// let cleanup of a temporary directory take down the caller.
			try {
				rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
			} catch {
				/* left for the sweep on next start */
			}
		}
	}
}

let singleton = null;

export function getChromium() {
	if (singleton) return singleton;
	const binary = findChromium();
	if (!binary) return null;
	singleton = new ChromiumSession(binary);
	return singleton;
}

export async function closeChromium() {
	if (singleton) {
		await singleton.close();
		singleton = null;
	}
}

for (const signal of ['exit', 'SIGINT', 'SIGTERM']) {
	process.once(signal, () => {
		singleton?.proc?.kill();
	});
}
