/**
 * Quietens the `node:sqlite` experimental notice, which would otherwise print
 * on every command an operator runs.
 *
 * Node installs its own 'warning' listener at startup, so adding another does
 * not replace it — the default printer has to be removed and substituted. Every
 * warning other than that one notice is still printed, in the same shape.
 *
 * Import this *before* node:sqlite is loaded.
 */
process.removeAllListeners('warning');

process.on('warning', (warning) => {
	if (warning.name === 'ExperimentalWarning' && /\bSQLite\b/i.test(warning.message)) return;
	const detail = warning.stack ?? `${warning.name}: ${warning.message}`;
	console.warn(detail);
});
