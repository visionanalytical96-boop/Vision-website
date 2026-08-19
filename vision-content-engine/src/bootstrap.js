/**
 * One-shot startup: workspace, migrations, seed data and the bootstrap admin.
 * Safe to run repeatedly — every step is idempotent.
 */
import { config } from './config/env.js';
import { hashPassword } from './auth/passwords.js';
import { migrate } from './db/database.js';
import { categories, settings, templates, users } from './db/repositories.js';
import { SEED_CATEGORIES } from './domain/categories.js';
import { SEED_TEMPLATES } from './design/templates/index.js';
import { DEFAULT_SCHEDULE } from './engine/scheduler.js';
import { DEFAULT_ROTATION } from './engine/rotation.js';
import { log } from './engine/logger.js';
import { ensureWorkspace } from './engine/storage.js';

export async function bootstrap({ quiet = false } = {}) {
	const report = { migrations: [], categories: 0, templates: 0, adminCreated: false };

	ensureWorkspace();
	report.migrations = migrate();

	// Seed categories.
	for (const category of SEED_CATEGORIES) {
		if (categories.findBySlug(category.slug)) continue;
		categories.create(category);
		report.categories += 1;
	}

	// Seed templates. Existing rows are left untouched so administrator edits
	// are never overwritten by an upgrade.
	for (const template of SEED_TEMPLATES) {
		if (templates.findBySlug(template.slug)) continue;
		templates.create(template);
		report.templates += 1;
	}

	// Default settings.
	if (settings.get('schedule') === null) settings.set('schedule', DEFAULT_SCHEDULE);
	if (settings.get('rotation') === null) settings.set('rotation', DEFAULT_ROTATION);
	if (settings.get('branding') === null) settings.set('branding', {});

	// Bootstrap admin, only when credentials are supplied and no user exists.
	if (users.count() === 0 && config.auth.adminEmail && config.auth.adminPassword) {
		users.create({
			email: config.auth.adminEmail,
			passwordHash: await hashPassword(config.auth.adminPassword),
			role: 'admin',
		});
		report.adminCreated = true;
	}

	if (!quiet) {
		log.info('bootstrap', 'Content engine ready', {
			workspace: '(configured)',
			migrations: report.migrations.length,
			categoriesSeeded: report.categories,
			templatesSeeded: report.templates,
			adminCreated: report.adminCreated,
		});
	}
	return report;
}
