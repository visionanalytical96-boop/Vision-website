import { readFileSync, readdirSync } from 'node:fs';
import { validateHireManifest } from process.env.MD_HIRE_TS ?? '/tmp/hv/hire.ts';

const dir = '/home/user/Vision-website/agent-office/munder-difflin';
let bad = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.hire.json'))) {
	const res = validateHireManifest(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
	console.log(`${res.ok ? 'VALID  ' : 'INVALID'} ${f}${res.ok ? '' : ' -> ' + res.errors.join('; ')}`);
	if (!res.ok) bad++;
}
console.log(bad ? `\n${bad} INVALID` : '\nAll manifests validate against the shipped munder-difflin validator.');
