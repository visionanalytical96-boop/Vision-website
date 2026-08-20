/**
 * Document composition: totals arithmetic, amount-in-words, field validation
 * and escaping. PDF rendering itself is covered by the render suite.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { numberToWords, rupeesInWords } from '../src/documents/amount-words.js';
import { DOCUMENT_FIELDS, DOCUMENT_KEYS, validateFields } from '../src/documents/fields.js';
import { composeDocument } from '../src/documents/generator.js';
import { DEFAULT_BRANDING } from '../src/config/branding.js';

const compose = (kind, values) => composeDocument(kind, values, DEFAULT_BRANDING);

describe('amount in words', () => {
  it('handles the Indian groupings', () => {
    assert.equal(numberToWords(100000), 'One Lakh');
    assert.equal(numberToWords(7250000), 'Seventy Two Lakh Fifty Thousand');
    assert.equal(numberToWords(12345678), 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight');
  });

  it('gets the boundaries right', () => {
    assert.equal(numberToWords(0), 'Zero');
    assert.equal(numberToWords(19), 'Nineteen');
    assert.equal(numberToWords(20), 'Twenty');
    assert.equal(numberToWords(999), 'Nine Hundred Ninety Nine');
  });

  it('singularises one rupee', () => {
    assert.equal(rupeesInWords(1), 'One Rupee Only');
    assert.equal(rupeesInWords(2), 'Two Rupees Only');
  });

  it('includes paise only when present', () => {
    assert.equal(rupeesInWords(86022), 'Eighty Six Thousand Twenty Two Rupees Only');
    assert.match(rupeesInWords(86022.5), /and Fifty Paise Only$/);
  });
});

describe('invoice arithmetic', () => {
  const base = {
    documentKind: 'Tax Invoice',
    date: '2026-08-20',
    billTo: 'Sun Pharmaceutical Industries Ltd.',
  };

  it('computes the line amount from qty and rate when left blank', () => {
    const html = compose('invoice', { ...base, items: [['Seal kit', '8443', '2', '3200', '']] });
    assert.match(html, /6,400\.00/, 'expected 2 × 3200 = 6400');
  });

  it('honours an explicitly entered amount over qty × rate', () => {
    const html = compose('invoice', { ...base, items: [['Discounted item', '', '2', '3200', '5000']] });
    assert.match(html, /5,000\.00/);
    assert.doesNotMatch(html, /6,400\.00/);
  });

  it('applies GST and totals correctly', () => {
    const html = compose('invoice', {
      ...base,
      taxRate: '18',
      items: [['AMC', '998719', '1', '48000', ''], ['Lamp', '8539', '1', '18500', '']],
    });
    assert.match(html, /66,500\.00/, 'subtotal');
    assert.match(html, /11,970\.00/, 'GST at 18%');
    assert.match(html, /78,470\.00/, 'grand total');
  });

  it('derives the words from the computed total, not a typed field', () => {
    const html = compose('invoice', {
      ...base,
      taxRate: '18',
      // A stale hand-typed figure must not appear anywhere.
      amountInWords: 'One Rupee Only',
      items: [['AMC', '', '1', '48000', '']],
    });
    assert.match(html, /Fifty Six Thousand Six Hundred Forty Rupees Only/);
    assert.doesNotMatch(html, /One Rupee Only/);
  });

  it('omits totals entirely when there are no line items', () => {
    const html = compose('invoice', { ...base, items: [] });
    assert.match(html, /No line items entered/);
  });
});

describe('field validation', () => {
  it('reports every missing required field', () => {
    const result = validateFields('service-report', {});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /Customer/.test(e)));
    assert.ok(result.errors.some((e) => /Instrument/.test(e)));
    assert.ok(result.errors.some((e) => /Work carried out/.test(e)));
  });

  it('treats whitespace as missing', () => {
    assert.equal(validateFields('service-report', { customer: '   ' }).ok, false);
  });

  it('passes when every required field is filled', () => {
    const result = validateFields('service-report', {
      date: '2026-08-20',
      customer: 'ACME',
      instrument: 'HPLC',
      workDone: 'Serviced',
      engineerName: 'S. K.',
    });
    assert.ok(result.ok, result.errors.join('; '));
  });

  it('every document declares a name, description and fields', () => {
    for (const key of DOCUMENT_KEYS) {
      const d = DOCUMENT_FIELDS[key];
      assert.ok(d.name, `${key} has no name`);
      assert.ok(d.description, `${key} has no description`);
      assert.ok(d.fields.length > 0, `${key} has no fields`);
      for (const f of d.fields) {
        assert.ok(f.key && f.label && f.type, `${key} has a malformed field`);
      }
    }
  });
});

describe('document composition', () => {
  it('renders every document type to complete HTML', () => {
    for (const kind of DOCUMENT_KEYS) {
      const html = compose(kind, { date: '2026-08-20' });
      assert.match(html, /^<!doctype html>/i, `${kind} is not a document`);
      assert.match(html, /@page/, `${kind} has no print page rule`);
      assert.ok(html.includes(DEFAULT_BRANDING.logoWordmark), `${kind} is missing the letterhead`);
      assert.ok(html.includes('</html>'), `${kind} is truncated`);
    }
  });

  it('escapes user input rather than injecting it as markup', () => {
    const html = compose('service-report', {
      date: '2026-08-20',
      customer: '<script>alert(1)</script>',
      instrument: 'A & B "quoted"',
    });
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /A &amp; B/);
  });

  it('drops empty sections instead of leaving blank headings', () => {
    const html = compose('service-report', { date: '2026-08-20', customer: 'ACME' });
    assert.doesNotMatch(html, /Parts used/, 'no parts means no parts table');
    assert.doesNotMatch(html, /Recommendations/);
  });

  it('watermarks a quotation but not a tax invoice', () => {
    assert.match(compose('invoice', { documentKind: 'Quotation', items: [] }), /watermark/);
    assert.doesNotMatch(compose('invoice', { documentKind: 'Tax Invoice', items: [] }), /class="watermark"/);
  });

  it('falls back to standard employment terms when none are given', () => {
    const html = compose('offer-letter', { date: '2026-08-20', candidateName: 'A', designation: 'Engineer' });
    assert.match(html, /confidentiality/i);
  });

  it('rejects an unknown document type', () => {
    assert.throws(() => compose('not-a-document', {}), /Unknown document type/);
  });
});
