/**
 * SQLite storage via Node's built-in `node:sqlite` — no native module to build
 * and no extra dependency to keep patched.
 *
 * This engine ships its own database because the existing Vision Analytical site
 * is a static page with no datastore to reuse. If a database is introduced to
 * the main application later, the repositories in this package are the only
 * place that needs to change.
 */
import '../util/warnings.js';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config/env.js';

// node:sqlite is loaded here rather than with a static import so that it is
// pulled in *after* the warning filter above is installed — a static import
// would be linked before any module body runs, and its experimental notice
// would print regardless.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

let db = null;

export function getDatabase() {
	if (db) return db;
	mkdirSync(dirname(config.paths.database), { recursive: true });
	db = new DatabaseSync(config.paths.database);
	db.exec('PRAGMA journal_mode = WAL');
	db.exec('PRAGMA foreign_keys = ON');
	db.exec('PRAGMA busy_timeout = 5000');
	return db;
}

export function closeDatabase() {
	db?.close();
	db = null;
}

/**
 * Migrations are append-only. Each entry runs once and is recorded, so an
 * existing deployment upgrades without losing data.
 */
const MIGRATIONS = [
	{
		id: '001-initial',
		sql: `
		CREATE TABLE settings (
			key        TEXT PRIMARY KEY,
			value      TEXT NOT NULL,
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE users (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			email         TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role          TEXT NOT NULL DEFAULT 'admin',
			created_at    TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE sessions (
			id         TEXT PRIMARY KEY,
			user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE categories (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			slug       TEXT NOT NULL UNIQUE,
			name       TEXT NOT NULL,
			kind       TEXT NOT NULL DEFAULT 'product',
			active     INTEGER NOT NULL DEFAULT 1,
			last_used_at TEXT,
			usage_count  INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE templates (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			slug          TEXT NOT NULL UNIQUE,
			name          TEXT NOT NULL,
			family        TEXT NOT NULL,
			theme         TEXT NOT NULL DEFAULT 'dark',
			description   TEXT,
			config        TEXT NOT NULL DEFAULT '{}',
			format_preset TEXT,
			output_format TEXT NOT NULL DEFAULT 'png',
			width         INTEGER,
			height        INTEGER,
			active        INTEGER NOT NULL DEFAULT 1,
			usage_count   INTEGER NOT NULL DEFAULT 0,
			last_used_at  TEXT,
			created_at    TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE products (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			slug            TEXT NOT NULL UNIQUE,
			name            TEXT NOT NULL,
			brand           TEXT,
			model           TEXT,
			category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
			description     TEXT,
			specifications  TEXT NOT NULL DEFAULT '[]',
			features        TEXT NOT NULL DEFAULT '[]',
			applications    TEXT NOT NULL DEFAULT '[]',
			condition       TEXT,
			year            TEXT,
			configuration   TEXT,
			detector        TEXT,
			pump            TEXT,
			autosampler     TEXT,
			software        TEXT,
			accessories     TEXT,
			warranty        TEXT,
			installation    TEXT,
			calibration     TEXT,
			iq_oq_pq        TEXT,
			training        TEXT,
			price           TEXT,
			price_type      TEXT,
			stock_status    TEXT,
			part_number     TEXT,
			compatible_with TEXT NOT NULL DEFAULT '[]',
			images          TEXT NOT NULL DEFAULT '[]',
			documents       TEXT NOT NULL DEFAULT '[]',
			brochure_url    TEXT,
			website_url     TEXT,
			tags            TEXT NOT NULL DEFAULT '[]',
			status          TEXT NOT NULL DEFAULT 'draft',
			publish_count   INTEGER NOT NULL DEFAULT 0,
			last_published_at TEXT,
			archived_at     TEXT,
			created_at      TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE content_items (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			uid           TEXT NOT NULL UNIQUE,
			product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
			template_id   INTEGER REFERENCES templates(id) ON DELETE SET NULL,
			category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
			title         TEXT NOT NULL,
			description   TEXT,
			tags          TEXT NOT NULL DEFAULT '[]',
			format_preset TEXT,
			output_format TEXT NOT NULL DEFAULT 'png',
			width         INTEGER,
			height        INTEGER,
			file_name     TEXT,
			file_size     INTEGER,
			checksum      TEXT,
			status        TEXT NOT NULL DEFAULT 'draft',
			scheduled_for TEXT,
			generated_at  TEXT,
			published_at  TEXT,
			published_url TEXT,
			error         TEXT,
			retry_count   INTEGER NOT NULL DEFAULT 0,
			validation    TEXT,
			origin        TEXT NOT NULL DEFAULT 'manual',
			created_at    TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE publications (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			content_id  INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
			destination TEXT NOT NULL,
			status      TEXT NOT NULL,
			url         TEXT,
			attempt     INTEGER NOT NULL DEFAULT 1,
			response    TEXT,
			error       TEXT,
			created_at  TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE rotation_history (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			combo_key   TEXT NOT NULL,
			product_id  INTEGER,
			template_id INTEGER,
			category_id INTEGER,
			used_at     TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE logs (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			level      TEXT NOT NULL,
			event      TEXT NOT NULL,
			message    TEXT,
			context    TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE INDEX idx_products_status ON products(status, archived_at);
		CREATE INDEX idx_products_category ON products(category_id);
		CREATE INDEX idx_products_rotation ON products(last_published_at, publish_count);
		CREATE INDEX idx_templates_active ON templates(active, family);
		CREATE INDEX idx_content_status ON content_items(status, scheduled_for);
		CREATE INDEX idx_content_published ON content_items(published_at);
		CREATE INDEX idx_rotation_combo ON rotation_history(combo_key, used_at);
		CREATE INDEX idx_logs_created ON logs(created_at, level);
		CREATE INDEX idx_publications_content ON publications(content_id);
		`,
	},
];

export function migrate() {
	const database = getDatabase();
	database.exec(`CREATE TABLE IF NOT EXISTS migrations (
		id         TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`);

	const applied = new Set(database.prepare('SELECT id FROM migrations').all().map((row) => row.id));
	const ran = [];

	for (const migration of MIGRATIONS) {
		if (applied.has(migration.id)) continue;
		// node:sqlite has no nested-transaction helper; a plain BEGIN/COMMIT is
		// enough because migrations run single-threaded at startup.
		database.exec('BEGIN');
		try {
			database.exec(migration.sql);
			database.prepare('INSERT INTO migrations (id) VALUES (?)').run(migration.id);
			database.exec('COMMIT');
			ran.push(migration.id);
		} catch (err) {
			database.exec('ROLLBACK');
			throw new Error(`Migration ${migration.id} failed: ${err.message}`);
		}
	}
	return ran;
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export function transaction(fn) {
	const database = getDatabase();
	database.exec('BEGIN');
	try {
		const result = fn(database);
		database.exec('COMMIT');
		return result;
	} catch (err) {
		database.exec('ROLLBACK');
		throw err;
	}
}

/** node:sqlite returns null-prototype rows; normalise for safe property access. */
export function plain(row) {
	return row ? { ...row } : null;
}

export function plainAll(rows) {
	return rows.map((row) => ({ ...row }));
}
