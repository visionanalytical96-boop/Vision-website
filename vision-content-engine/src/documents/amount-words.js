/**
 * Rupee amounts in words, Indian numbering (thousand, lakh, crore).
 *
 * Computed from the invoice total rather than typed by the operator: a
 * hand-entered figure drifts out of step with the arithmetic the moment a line
 * item changes, and an invoice whose words contradict its total is a dispute
 * waiting to happen.
 */

const ONES = [
	'', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
	'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
	'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 0–99. */
function twoDigits(n) {
	if (n < 20) return ONES[n];
	const tens = TENS[Math.floor(n / 10)];
	const ones = ONES[n % 10];
	return ones ? `${tens} ${ones}` : tens;
}

/** 0–999. */
function threeDigits(n) {
	const hundreds = Math.floor(n / 100);
	const rest = n % 100;
	const parts = [];
	if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
	if (rest) parts.push(twoDigits(rest));
	return parts.join(' ');
}

/**
 * Whole number to words using Indian groupings.
 * @param {number} value
 */
export function numberToWords(value) {
	const n = Math.floor(Math.abs(Number(value) || 0));
	if (n === 0) return 'Zero';

	// Indian grouping: crore, lakh, thousand, then the final three digits.
	const crore = Math.floor(n / 10000000);
	const lakh = Math.floor((n % 10000000) / 100000);
	const thousand = Math.floor((n % 100000) / 1000);
	const rest = n % 1000;

	const parts = [];
	if (crore) parts.push(`${numberToWords(crore)} Crore`);
	if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
	if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
	if (rest) parts.push(threeDigits(rest));
	return parts.join(' ');
}

/**
 * Full rupee phrase, including paise when the amount is not whole.
 * @param {number} amount
 * @returns {string} e.g. "Eighty Six Thousand Twenty Two Rupees Only"
 */
export function rupeesInWords(amount) {
	const value = Number(amount) || 0;
	const rupees = Math.floor(value);
	// Rounded rather than truncated so 0.005 does not silently vanish.
	const paise = Math.round((value - rupees) * 100);

	const head = `${numberToWords(rupees)} Rupee${rupees === 1 ? '' : 's'}`;
	if (!paise) return `${head} Only`;
	return `${head} and ${numberToWords(paise)} Paise Only`;
}
