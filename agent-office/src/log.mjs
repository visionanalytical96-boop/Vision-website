const ESC = String.fromCharCode(27);
const C = {
	reset: `${ESC}[0m`,
	dim: `${ESC}[2m`,
	cyan: `${ESC}[36m`,
	blue: `${ESC}[34m`,
	green: `${ESC}[32m`,
	yellow: `${ESC}[33m`,
	red: `${ESC}[31m`,
	bold: `${ESC}[1m`,
};

const enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (enabled ? `${code}${s}${C.reset}` : String(s));
const pad = (s) => String(s).padEnd(20).slice(0, 20);

export const log = {
	title: (s) => console.log(`\n${paint(C.bold + C.cyan, s)}`),
	step: (role, s) => console.log(`  ${paint(C.blue, pad(role))} ${s}`),
	tool: (role, s) => console.log(`  ${paint(C.dim, pad(role))} ${paint(C.dim, s)}`),
	ok: (s) => console.log(`  ${paint(C.green, 'OK')}  ${s}`),
	warn: (s) => console.log(`  ${paint(C.yellow, '!!')}  ${s}`),
	err: (s) => console.error(`  ${paint(C.red, 'XX')}  ${s}`),
	info: (s) => console.log(`  ${paint(C.dim, s)}`),
	plain: (s) => console.log(s),
};
