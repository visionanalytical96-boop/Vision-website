/**
 * Data access. Every SQL statement in the engine lives here.
 */
import { randomUUID } from 'node:crypto';
import { getDatabase, plain, plainAll } from './database.js';
import { slugify } from '../domain/categories.js';

const JSON_FIELDS = {
	documents: ['fields'],
	products: ['specifications', 'features', 'applications', 'compatible_with', 'images', 'documents', 'tags'],
	templates: ['config'],
	content_items: ['tags', 'validation'],
	publications: ['response'],
	logs: ['context'],
};

function parseJsonFields(row, table) {
	if (!row) return null;
	const out = { ...row };
	for (const field of JSON_FIELDS[table] ?? []) {
		if (typeof out[field] === 'string') {
			try {
				out[field] = JSON.parse(out[field]);
			} catch {
				out[field] = Array.isArray(out[field]) ? [] : null;
			}
		}
	}
	return out;
}

const parseRows = (rows, table) => rows.map((row) => parseJsonFields(row, table));
const asJson = (value, fallback = '[]') => (value === undefined ? fallback : JSON.stringify(value ?? JSON.parse(fallback)));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export const settings = {
	get(key, fallback = null) {
		const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key);
		if (!row) return fallback;
		try {
			return JSON.parse(row.value);
		} catch {
			return fallback;
		}
	},

	set(key, value) {
		getDatabase()
			.prepare(
				`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
				 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
			)
			.run(key, JSON.stringify(value ?? null), now());
		return value;
	},

	all() {
		const rows = plainAll(getDatabase().prepare('SELECT key, value FROM settings').all());
		const out = {};
		for (const row of rows) {
			try {
				out[row.key] = JSON.parse(row.value);
			} catch {
				out[row.key] = null;
			}
		}
		return out;
	},
};

/* ------------------------------------------------------------------ *
 * Users and sessions
 * ------------------------------------------------------------------ */

export const users = {
	findByEmail(email) {
		return plain(getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()));
	},

	findById(id) {
		return plain(getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id));
	},

	create({ email, passwordHash, role = 'admin' }) {
		const result = getDatabase()
			.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
			.run(String(email).toLowerCase(), passwordHash, role);
		return this.findById(result.lastInsertRowid);
	},

	count() {
		return getDatabase().prepare('SELECT COUNT(*) AS n FROM users').get().n;
	},

	updatePassword(id, passwordHash) {
		getDatabase().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
	},
};

export const sessions = {
	create(userId, ttlHours) {
		const id = randomUUID();
		const expires = new Date(Date.now() + ttlHours * 3600_000).toISOString();
		getDatabase().prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expires);
		return { id, expiresAt: expires };
	},

	find(id) {
		if (!id) return null;
		const row = plain(
			getDatabase()
				.prepare(
					`SELECT s.id, s.user_id, s.expires_at, u.email, u.role
					 FROM sessions s JOIN users u ON u.id = s.user_id
					 WHERE s.id = ?`,
				)
				.get(id),
		);
		if (!row) return null;
		if (new Date(row.expires_at).getTime() < Date.now()) {
			this.destroy(id);
			return null;
		}
		return row;
	},

	destroy(id) {
		getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id);
	},

	purgeExpired() {
		return getDatabase().prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run().changes;
	},
};

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export const categories = {
	list({ activeOnly = false } = {}) {
		const sql = activeOnly
			? 'SELECT * FROM categories WHERE active = 1 ORDER BY name'
			: 'SELECT * FROM categories ORDER BY name';
		return plainAll(getDatabase().prepare(sql).all());
	},

	find(id) {
		return plain(getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id));
	},

	findBySlug(slug) {
		return plain(getDatabase().prepare('SELECT * FROM categories WHERE slug = ?').get(slug));
	},

	create({ slug, name, kind = 'product', active = 1 }) {
		const finalSlug = slug || slugify(name);
		const result = getDatabase()
			.prepare('INSERT INTO categories (slug, name, kind, active) VALUES (?, ?, ?, ?)')
			.run(finalSlug, name, kind, active ? 1 : 0);
		return this.find(result.lastInsertRowid);
	},

	update(id, patch) {
		const current = this.find(id);
		if (!current) return null;
		getDatabase()
			.prepare('UPDATE categories SET name = ?, kind = ?, active = ? WHERE id = ?')
			.run(patch.name ?? current.name, patch.kind ?? current.kind, (patch.active ?? current.active) ? 1 : 0, id);
		return this.find(id);
	},

	remove(id) {
		return getDatabase().prepare('DELETE FROM categories WHERE id = ?').run(id).changes;
	},

	markUsed(id) {
		getDatabase()
			.prepare('UPDATE categories SET usage_count = usage_count + 1, last_used_at = ? WHERE id = ?')
			.run(now(), id);
	},
};

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

const TEMPLATE_COLUMNS = [
	'slug',
	'name',
	'family',
	'theme',
	'description',
	'config',
	'format_preset',
	'output_format',
	'width',
	'height',
	'active',
];

export const templates = {
	list({ activeOnly = false, family = null } = {}) {
		const clauses = [];
		const params = [];
		if (activeOnly) clauses.push('active = 1');
		if (family) {
			clauses.push('family = ?');
			params.push(family);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		return parseRows(
			plainAll(getDatabase().prepare(`SELECT * FROM templates ${where} ORDER BY name`).all(...params)),
			'templates',
		);
	},

	find(id) {
		return parseJsonFields(plain(getDatabase().prepare('SELECT * FROM templates WHERE id = ?').get(id)), 'templates');
	},

	findBySlug(slug) {
		return parseJsonFields(
			plain(getDatabase().prepare('SELECT * FROM templates WHERE slug = ?').get(slug)),
			'templates',
		);
	},

	create(data) {
		const slug = uniqueSlug('templates', data.slug || slugify(data.name));
		const result = getDatabase()
			.prepare(
				`INSERT INTO templates (${TEMPLATE_COLUMNS.join(', ')})
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				slug,
				data.name,
				data.family,
				data.theme ?? 'dark',
				data.description ?? '',
				asJson(data.config, '{}'),
				data.formatPreset ?? data.format_preset ?? null,
				data.outputFormat ?? data.output_format ?? 'png',
				data.width ?? null,
				data.height ?? null,
				(data.active ?? 1) ? 1 : 0,
			);
		return this.find(result.lastInsertRowid);
	},

	update(id, patch) {
		const current = this.find(id);
		if (!current) return null;
		getDatabase()
			.prepare(
				`UPDATE templates SET name = ?, family = ?, theme = ?, description = ?, config = ?,
				 format_preset = ?, output_format = ?, width = ?, height = ?, active = ?, updated_at = ?
				 WHERE id = ?`,
			)
			.run(
				patch.name ?? current.name,
				patch.family ?? current.family,
				patch.theme ?? current.theme,
				patch.description ?? current.description,
				asJson(patch.config ?? current.config, '{}'),
				patch.formatPreset ?? patch.format_preset ?? current.format_preset,
				patch.outputFormat ?? patch.output_format ?? current.output_format,
				patch.width ?? current.width,
				patch.height ?? current.height,
				(patch.active ?? current.active) ? 1 : 0,
				now(),
				id,
			);
		return this.find(id);
	},

	duplicate(id, name) {
		const source = this.find(id);
		if (!source) return null;
		return this.create({
			name: name || `${source.name} (Copy)`,
			slug: slugify(`${source.slug}-copy`),
			family: source.family,
			theme: source.theme,
			description: source.description,
			config: source.config,
			formatPreset: source.format_preset,
			outputFormat: source.output_format,
			width: source.width,
			height: source.height,
			active: 0, // copies start inactive so they cannot be picked up mid-edit
		});
	},

	remove(id) {
		return getDatabase().prepare('DELETE FROM templates WHERE id = ?').run(id).changes;
	},

	markUsed(id) {
		getDatabase()
			.prepare('UPDATE templates SET usage_count = usage_count + 1, last_used_at = ? WHERE id = ?')
			.run(now(), id);
	},

	/** Least-recently-used first, for rotation. */
	rotationCandidates(families) {
		const list = this.list({ activeOnly: true });
		const allowed = families?.length ? list.filter((t) => families.includes(t.family)) : list;
		return (allowed.length ? allowed : list).sort((a, b) => {
			if (a.usage_count !== b.usage_count) return a.usage_count - b.usage_count;
			return String(a.last_used_at ?? '').localeCompare(String(b.last_used_at ?? ''));
		});
	},
};

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

const PRODUCT_FIELDS = [
	'name',
	'brand',
	'model',
	'category_id',
	'description',
	'specifications',
	'features',
	'applications',
	'condition',
	'year',
	'configuration',
	'detector',
	'pump',
	'autosampler',
	'software',
	'accessories',
	'warranty',
	'installation',
	'calibration',
	'iq_oq_pq',
	'training',
	'price',
	'price_type',
	'stock_status',
	'part_number',
	'compatible_with',
	'images',
	'documents',
	'brochure_url',
	'website_url',
	'tags',
	'status',
];

const JSON_PRODUCT_FIELDS = new Set([
	'specifications',
	'features',
	'applications',
	'compatible_with',
	'images',
	'documents',
	'tags',
]);

/** Accepts camelCase or snake_case from the API and normalises to columns. */
function productValues(data, current = {}) {
	const pick = (field) => {
		const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
		if (data[field] !== undefined) return data[field];
		if (data[camel] !== undefined) return data[camel];
		return undefined;
	};
	return PRODUCT_FIELDS.map((field) => {
		const value = pick(field);
		if (JSON_PRODUCT_FIELDS.has(field)) {
			if (value === undefined) return current[field] !== undefined ? JSON.stringify(current[field]) : '[]';
			return JSON.stringify(value ?? []);
		}
		if (value === undefined) return current[field] ?? null;
		return value === '' ? null : value;
	});
}

export const products = {
	list({ status = null, categoryId = null, search = null, includeArchived = false, limit = 200, offset = 0 } = {}) {
		const clauses = [];
		const params = [];
		if (!includeArchived) clauses.push('archived_at IS NULL');
		if (status) {
			clauses.push('status = ?');
			params.push(status);
		}
		if (categoryId) {
			clauses.push('category_id = ?');
			params.push(categoryId);
		}
		if (search) {
			clauses.push('(name LIKE ? OR brand LIKE ? OR model LIKE ? OR part_number LIKE ?)');
			const term = `%${search}%`;
			params.push(term, term, term, term);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		return parseRows(
			plainAll(
				getDatabase()
					.prepare(`SELECT * FROM products ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
					.all(...params, limit, offset),
			),
			'products',
		);
	},

	count({ status = null, includeArchived = false } = {}) {
		const clauses = [];
		const params = [];
		if (!includeArchived) clauses.push('archived_at IS NULL');
		if (status) {
			clauses.push('status = ?');
			params.push(status);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		return getDatabase().prepare(`SELECT COUNT(*) AS n FROM products ${where}`).get(...params).n;
	},

	find(id) {
		return parseJsonFields(plain(getDatabase().prepare('SELECT * FROM products WHERE id = ?').get(id)), 'products');
	},

	findBySlug(slug) {
		return parseJsonFields(plain(getDatabase().prepare('SELECT * FROM products WHERE slug = ?').get(slug)), 'products');
	},

	create(data) {
		const slug = uniqueSlug('products', data.slug || slugify(defaultProductSlug(data)));
		const placeholders = PRODUCT_FIELDS.map(() => '?').join(', ');
		const result = getDatabase()
			.prepare(`INSERT INTO products (slug, ${PRODUCT_FIELDS.join(', ')}) VALUES (?, ${placeholders})`)
			.run(slug, ...productValues(data));
		return this.find(result.lastInsertRowid);
	},

	update(id, patch) {
		const current = this.find(id);
		if (!current) return null;
		const assignments = PRODUCT_FIELDS.map((f) => `${f} = ?`).join(', ');
		getDatabase()
			.prepare(`UPDATE products SET ${assignments}, updated_at = ? WHERE id = ?`)
			.run(...productValues(patch, current), now(), id);
		return this.find(id);
	},

	duplicate(id, name) {
		const source = this.find(id);
		if (!source) return null;
		return this.create({ ...source, name: name || `${source.name} (Copy)`, slug: null, status: 'draft' });
	},

	archive(id) {
		getDatabase().prepare('UPDATE products SET archived_at = ?, updated_at = ? WHERE id = ?').run(now(), now(), id);
		return this.find(id);
	},

	restore(id) {
		getDatabase().prepare('UPDATE products SET archived_at = NULL, updated_at = ? WHERE id = ?').run(now(), id);
		return this.find(id);
	},

	remove(id) {
		return getDatabase().prepare('DELETE FROM products WHERE id = ?').run(id).changes;
	},

	markPublished(id) {
		getDatabase()
			.prepare('UPDATE products SET publish_count = publish_count + 1, last_published_at = ? WHERE id = ?')
			.run(now(), id);
	},

	/**
	 * Rotation ordering: never-published first, then oldest published, then
	 * lowest publish count.
	 */
	rotationCandidates({ categoryId = null } = {}) {
		const clauses = ["archived_at IS NULL", "status = 'published'"];
		const params = [];
		if (categoryId) {
			clauses.push('category_id = ?');
			params.push(categoryId);
		}
		return parseRows(
			plainAll(
				getDatabase()
					.prepare(
						`SELECT * FROM products WHERE ${clauses.join(' AND ')}
						 ORDER BY (last_published_at IS NOT NULL), last_published_at ASC, publish_count ASC, id ASC`,
					)
					.all(...params),
			),
			'products',
		);
	},
};

/* ------------------------------------------------------------------ *
 * Content items
 * ------------------------------------------------------------------ */

export const content = {
	list({ status = null, from = null, to = null, limit = 200, offset = 0 } = {}) {
		const clauses = [];
		const params = [];
		if (status) {
			const list = Array.isArray(status) ? status : [status];
			clauses.push(`status IN (${list.map(() => '?').join(', ')})`);
			params.push(...list);
		}
		if (from) {
			clauses.push("COALESCE(scheduled_for, created_at) >= ?");
			params.push(from);
		}
		if (to) {
			clauses.push("COALESCE(scheduled_for, created_at) <= ?");
			params.push(to);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		return parseRows(
			plainAll(
				getDatabase()
					.prepare(
						`SELECT * FROM content_items ${where}
						 ORDER BY COALESCE(scheduled_for, created_at) DESC LIMIT ? OFFSET ?`,
					)
					.all(...params, limit, offset),
			),
			'content_items',
		);
	},

	find(id) {
		return parseJsonFields(
			plain(getDatabase().prepare('SELECT * FROM content_items WHERE id = ?').get(id)),
			'content_items',
		);
	},

	findByUid(uid) {
		return parseJsonFields(
			plain(getDatabase().prepare('SELECT * FROM content_items WHERE uid = ?').get(uid)),
			'content_items',
		);
	},

	create(data) {
		const result = getDatabase()
			.prepare(
				`INSERT INTO content_items
				 (uid, product_id, template_id, category_id, title, description, tags, format_preset,
				  output_format, width, height, status, scheduled_for, origin)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				data.uid ?? randomUUID(),
				data.productId ?? null,
				data.templateId ?? null,
				data.categoryId ?? null,
				data.title,
				data.description ?? '',
				asJson(data.tags),
				data.formatPreset ?? null,
				data.outputFormat ?? 'png',
				data.width ?? null,
				data.height ?? null,
				data.status ?? 'draft',
				data.scheduledFor ?? null,
				data.origin ?? 'manual',
			);
		return this.find(result.lastInsertRowid);
	},

	setStatus(id, status, extra = {}) {
		const current = this.find(id);
		if (!current) return null;
		getDatabase()
			.prepare(
				`UPDATE content_items SET status = ?, error = ?, file_name = ?, file_size = ?, checksum = ?,
				 generated_at = ?, published_at = ?, published_url = ?, validation = ?, retry_count = ?, updated_at = ?
				 WHERE id = ?`,
			)
			.run(
				status,
				extra.error ?? (status === 'failed' || status === 'publishing_failed' ? current.error : null),
				extra.fileName ?? current.file_name,
				extra.fileSize ?? current.file_size,
				extra.checksum ?? current.checksum,
				extra.generatedAt ?? current.generated_at,
				extra.publishedAt ?? current.published_at,
				extra.publishedUrl ?? current.published_url,
				extra.validation !== undefined ? JSON.stringify(extra.validation) : (current.validation ? JSON.stringify(current.validation) : null),
				extra.retryCount ?? current.retry_count,
				now(),
				id,
			);
		return this.find(id);
	},

	reschedule(id, scheduledFor) {
		getDatabase()
			.prepare("UPDATE content_items SET scheduled_for = ?, status = 'scheduled', updated_at = ? WHERE id = ?")
			.run(scheduledFor, now(), id);
		return this.find(id);
	},

	remove(id) {
		return getDatabase().prepare('DELETE FROM content_items WHERE id = ?').run(id).changes;
	},

	/** Scheduled items whose time has come. */
	due(nowIso) {
		return parseRows(
			plainAll(
				getDatabase()
					.prepare("SELECT * FROM content_items WHERE status = 'scheduled' AND scheduled_for <= ? ORDER BY scheduled_for")
					.all(nowIso),
			),
			'content_items',
		);
	},

	/** Looks up the item that owns a stored file — used to gate media access. */
	findByFile(key) {
		return parseJsonFields(
			plain(getDatabase().prepare('SELECT * FROM content_items WHERE file_name = ?').get(key)),
			'content_items',
		);
	},

	published({ limit = 50, offset = 0 } = {}) {
		return parseRows(
			plainAll(
				getDatabase()
					.prepare(
						"SELECT * FROM content_items WHERE status = 'published' ORDER BY published_at DESC LIMIT ? OFFSET ?",
					)
					.all(limit, offset),
			),
			'content_items',
		);
	},

	stats() {
		const db = getDatabase();
		const byStatus = plainAll(db.prepare('SELECT status, COUNT(*) AS n FROM content_items GROUP BY status').all());
		const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
		return {
			byStatus: counts,
			publishedToday: db
				.prepare("SELECT COUNT(*) AS n FROM content_items WHERE date(published_at) = date('now')")
				.get().n,
			publishedThisMonth: db
				.prepare("SELECT COUNT(*) AS n FROM content_items WHERE strftime('%Y-%m', published_at) = strftime('%Y-%m','now')")
				.get().n,
			generated: db.prepare("SELECT COUNT(*) AS n FROM content_items WHERE file_name IS NOT NULL").get().n,
			failed: (counts.failed ?? 0) + (counts.publishing_failed ?? 0),
			nextScheduled: plain(
				db
					.prepare(
						"SELECT scheduled_for, title FROM content_items WHERE status = 'scheduled' AND scheduled_for >= datetime('now') ORDER BY scheduled_for LIMIT 1",
					)
					.get(),
			),
		};
	},
};

/* ------------------------------------------------------------------ *
 * Publications, rotation history, logs
 * ------------------------------------------------------------------ */

export const publications = {
	record({ contentId, destination, status, url = null, attempt = 1, response = null, error = null }) {
		const result = getDatabase()
			.prepare(
				'INSERT INTO publications (content_id, destination, status, url, attempt, response, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
			)
			.run(contentId, destination, status, url, attempt, response ? JSON.stringify(response) : null, error);
		return result.lastInsertRowid;
	},

	forContent(contentId) {
		return parseRows(
			plainAll(
				getDatabase().prepare('SELECT * FROM publications WHERE content_id = ? ORDER BY created_at DESC').all(contentId),
			),
			'publications',
		);
	},
};

export const rotation = {
	comboKey(productId, templateId, categoryId) {
		return `${productId ?? 0}:${templateId ?? 0}:${categoryId ?? 0}`;
	},

	record({ productId, templateId, categoryId }) {
		getDatabase()
			.prepare('INSERT INTO rotation_history (combo_key, product_id, template_id, category_id) VALUES (?, ?, ?, ?)')
			.run(this.comboKey(productId, templateId, categoryId), productId ?? null, templateId ?? null, categoryId ?? null);
	},

	/** Combination keys used within the rotation window. */
	recentCombos(days) {
		const rows = plainAll(
			getDatabase()
				.prepare(`SELECT DISTINCT combo_key FROM rotation_history WHERE used_at >= datetime('now', ?)`)
				.all(`-${Math.max(0, Number(days) || 0)} days`),
		);
		return new Set(rows.map((r) => r.combo_key));
	},

	prune(days = 365) {
		return getDatabase()
			.prepare(`DELETE FROM rotation_history WHERE used_at < datetime('now', ?)`)
			.run(`-${days} days`).changes;
	},
};

export const logs = {
	write({ level = 'info', event, message = '', context = null }) {
		getDatabase()
			.prepare('INSERT INTO logs (level, event, message, context) VALUES (?, ?, ?, ?)')
			.run(level, event, message, context ? JSON.stringify(context) : null);
	},

	recent({ limit = 100, level = null, event = null } = {}) {
		const clauses = [];
		const params = [];
		if (level) {
			clauses.push('level = ?');
			params.push(level);
		}
		if (event) {
			clauses.push('event LIKE ?');
			params.push(`%${event}%`);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		return parseRows(
			plainAll(getDatabase().prepare(`SELECT * FROM logs ${where} ORDER BY id DESC LIMIT ?`).all(...params, limit)),
			'logs',
		);
	},

	prune(days) {
		return getDatabase().prepare(`DELETE FROM logs WHERE created_at < datetime('now', ?)`).run(`-${days} days`).changes;
	},
};


/* ------------------------------------------------------------------ *
 * Documents (A4 PDFs)
 * ------------------------------------------------------------------ */

export const documents = {
	list({ kind = null, limit = 200, offset = 0 } = {}) {
		const where = kind ? 'WHERE kind = ?' : '';
		const params = kind ? [kind] : [];
		return parseRows(
			plainAll(
				getDatabase()
					.prepare(`SELECT * FROM documents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
					.all(...params, limit, offset),
			),
			'documents',
		);
	},

	find(id) {
		return parseJsonFields(plain(getDatabase().prepare('SELECT * FROM documents WHERE id = ?').get(id)), 'documents');
	},

	create({ kind, title, fields = {}, status = 'draft', createdBy = null }) {
		const result = getDatabase()
			.prepare('INSERT INTO documents (uid, kind, title, fields, status, created_by) VALUES (?, ?, ?, ?, ?, ?)')
			.run(randomUUID(), kind, title, JSON.stringify(fields ?? {}), status, createdBy);
		return this.find(result.lastInsertRowid);
	},

	update(id, { title, fields }) {
		const current = this.find(id);
		if (!current) return null;
		getDatabase()
			.prepare('UPDATE documents SET title = ?, fields = ?, updated_at = ? WHERE id = ?')
			.run(title ?? current.title, JSON.stringify(fields ?? current.fields), now(), id);
		return this.find(id);
	},

	setStatus(id, status, extra = {}) {
		const current = this.find(id);
		if (!current) return null;
		getDatabase()
			.prepare('UPDATE documents SET status = ?, file_name = ?, file_size = ?, error = ?, updated_at = ? WHERE id = ?')
			.run(
				status,
				extra.fileName ?? current.file_name,
				extra.fileSize ?? current.file_size,
				extra.error !== undefined ? extra.error : current.error,
				now(),
				id,
			);
		return this.find(id);
	},

	remove(id) {
		// Only the record goes; the generated PDF stays on disk.
		return getDatabase().prepare('DELETE FROM documents WHERE id = ?').run(id).changes;
	},

	count() {
		return getDatabase().prepare('SELECT COUNT(*) AS n FROM documents').get().n;
	},
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */


/** Prefixes the brand only when the name does not already lead with it. */
function defaultProductSlug({ brand, name }) {
	const productName = String(name ?? '').trim();
	const brandName = String(brand ?? '').trim();
	if (!brandName) return productName;
	return productName.toLowerCase().startsWith(brandName.toLowerCase())
		? productName
		: `${brandName} ${productName}`;
}

/** Appends -2, -3 … until the slug is free. */
function uniqueSlug(table, base) {
	const db = getDatabase();
	const root = (base || 'item').slice(0, 70);
	let candidate = root;
	let suffix = 1;
	// Table name is from a fixed internal set, never user input.
	const statement = db.prepare(`SELECT 1 AS hit FROM ${table} WHERE slug = ?`);
	while (statement.get(candidate)) {
		suffix += 1;
		candidate = `${root}-${suffix}`;
	}
	return candidate;
}
