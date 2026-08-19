#!/usr/bin/env node
/** Creates the workspace, applies migrations and seeds default data. */
import { bootstrap } from '../src/bootstrap.js';
import { closeDatabase } from '../src/db/database.js';

const report = await bootstrap({ quiet: true });
console.log('Migrations applied :', report.migrations.length ? report.migrations.join(', ') : 'none (already current)');
console.log('Categories seeded  :', report.categories);
console.log('Templates seeded   :', report.templates);
console.log('Bootstrap admin    :', report.adminCreated ? 'created' : 'not created (set CONTENT_ENGINE_ADMIN_EMAIL / _PASSWORD)');
closeDatabase();
