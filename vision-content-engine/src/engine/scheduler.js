/**
 * Daily automation.
 *
 * A lightweight in-process ticker rather than a cron dependency, so the engine
 * is self-contained. n8n can drive the same entry points over HTTP if an
 * operator prefers to own scheduling there.
 *
 * Automatic publishing stays off unless an administrator turns it on: the
 * scheduler generates and leaves content in review by default.
 */
import { config } from '../config/env.js';
import { content, settings } from '../db/repositories.js';
import { generate, generateNext } from './generator.js';
import { log } from './logger.js';
import { publish } from './publisher.js';

export const DEFAULT_SCHEDULE = {
	enabled: false,
	times: ['10:00'],
	timezone: 'Asia/Kolkata',
	days: [0, 1, 2, 3, 4, 5, 6],
	postsPerDay: 1,
	categoryIds: [],
	autoPublish: false,
};

export function getSchedule() {
	return { ...DEFAULT_SCHEDULE, ...(settings.get('schedule', {}) ?? {}) };
}

export function setSchedule(patch) {
	const next = { ...getSchedule(), ...patch };
	settings.set('schedule', next);
	log.info('scheduler.updated', 'Schedule settings updated', {
		enabled: next.enabled,
		times: next.times,
		timezone: next.timezone,
		autoPublish: next.autoPublish,
	});
	return next;
}

/** Local wall-clock parts for a timezone, without pulling in a date library. */
export function zonedParts(date, timeZone) {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		weekday: 'short',
	});
	const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
	const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		// Intl can emit "24" for midnight in some environments.
		hour: Number(parts.hour) % 24,
		minute: Number(parts.minute),
		weekday: weekdays[parts.weekday] ?? 0,
	};
}

function schedulerState() {
	return settings.get('scheduler_state', { firedSlots: [] });
}

function rememberSlot(slot) {
	const state = schedulerState();
	const firedSlots = [...new Set([...(state.firedSlots ?? []), slot])].slice(-60);
	settings.set('scheduler_state', { ...state, firedSlots, lastFiredAt: new Date().toISOString() });
}

/**
 * Slots that are due now and have not fired yet.
 * A slot only fires on its own day, so a restart cannot replay yesterday.
 */
export function dueSlots(at = new Date(), schedule = getSchedule()) {
	if (!schedule.enabled) return [];
	const local = zonedParts(at, schedule.timezone);
	if (!schedule.days.includes(local.weekday)) return [];

	const fired = new Set(schedulerState().firedSlots ?? []);
	const nowMinutes = local.hour * 60 + local.minute;

	return (schedule.times ?? [])
		.filter((time) => {
			const [h, m] = String(time).split(':').map(Number);
			if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
			return nowMinutes >= h * 60 + m;
		})
		.map((time) => `${local.date}T${time}`)
		.filter((slot) => !fired.has(slot));
}

/**
 * Runs one scheduler tick: fires any due slots, then processes content that was
 * scheduled manually from the calendar.
 */
export async function tick(at = new Date()) {
	const schedule = getSchedule();
	const results = { generated: [], published: [], errors: [] };

	for (const slot of dueSlots(at, schedule)) {
		rememberSlot(slot);
		log.info('scheduler.fire', `Schedule slot ${slot} fired`, { postsPerDay: schedule.postsPerDay });

		for (let i = 0; i < Math.max(1, schedule.postsPerDay); i += 1) {
			try {
				const categoryId = pickCategory(schedule, i);
				const outcome = await generateNext({ categoryId, origin: 'scheduler' });
				if (!outcome) {
					results.errors.push('No eligible product/template combination was available');
					break;
				}
				results.generated.push(outcome.content.id);

				if (schedule.autoPublish && config.publishing.autoPublish) {
					const published = await publish(outcome.content.id);
					if (published.status === 'published') results.published.push(published.id);
				}
			} catch (err) {
				results.errors.push(err.message);
			}
		}
	}

	results.dueProcessed = await processDue(at);
	return results;
}

/** Generates and optionally publishes calendar items whose time has arrived. */
export async function processDue(at = new Date()) {
	const schedule = getSchedule();
	const due = content.due(at.toISOString());
	const processed = [];

	for (const item of due) {
		try {
			if (!item.product_id || !item.template_id) {
				content.setStatus(item.id, 'failed', { error: 'Scheduled item is missing a product or template' });
				continue;
			}
			const outcome = await generate({
				productId: item.product_id,
				templateId: item.template_id,
				categoryId: item.category_id,
				formatPreset: item.format_preset,
				outputFormat: item.output_format,
				width: item.width,
				height: item.height,
				origin: item.origin ?? 'scheduled',
				contentId: item.id,
			});
			processed.push(outcome.content.id);

			if (schedule.autoPublish && config.publishing.autoPublish) {
				await publish(outcome.content.id);
			}
		} catch (err) {
			log.error('scheduler.due_failed', err.message, { contentId: item.id });
		}
	}
	return processed;
}

/** Rotates through the configured categories across the posts in a slot. */
function pickCategory(schedule, index) {
	const list = schedule.categoryIds ?? [];
	if (!list.length) return null;
	return list[index % list.length];
}

let timer = null;

/** Starts the in-process ticker. */
export function startScheduler() {
	if (timer) return timer;
	const intervalMs = Math.max(30, config.scheduler.tickSeconds) * 1000;
	timer = setInterval(() => {
		tick().catch((err) => log.error('scheduler.tick_failed', err.message));
	}, intervalMs);
	// Do not hold the process open purely for the ticker.
	timer.unref?.();
	log.info('scheduler.started', `Scheduler ticking every ${intervalMs / 1000}s`);
	return timer;
}

export function stopScheduler() {
	if (timer) clearInterval(timer);
	timer = null;
}
