/**
 * Instagram publishing logic that can be verified without calling the API:
 * media classification, caption assembly and configuration guards.
 *
 * The network calls themselves are not mocked — they are exercised against the
 * real account by `npm run instagram:check`, which never publishes.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buildCaption, classifyMedia, instagramConfigured } from '../src/engine/publishers/instagram.js';
import { DEFAULT_BRANDING } from '../src/config/branding.js';

describe('instagram media classification', () => {
  it('accepts a square feed image', () => {
    assert.equal(classifyMedia({ width: 1080, height: 1080, format: 'jpeg' }).mediaType, 'IMAGE');
  });

  it('accepts 4:5 portrait, the tallest feed ratio', () => {
    assert.equal(classifyMedia({ width: 1080, height: 1350, format: 'jpeg' }).mediaType, 'IMAGE');
  });

  it('routes a 9:16 canvas to stories rather than the feed', () => {
    assert.equal(classifyMedia({ width: 1080, height: 1920, format: 'png' }).mediaType, 'STORIES');
  });

  it('rejects a banner that is too wide for the feed', () => {
    assert.throws(
      () => classifyMedia({ width: 1920, height: 640, format: 'jpeg' }),
      /aspect ratio/i,
      'a 3:1 banner must be refused before an API call is spent',
    );
  });

  it('rejects non-JPEG feed images, which Instagram will not accept', () => {
    assert.throws(() => classifyMedia({ width: 1080, height: 1080, format: 'png' }), /JPEG/i);
  });

  it('refuses content with unknown dimensions', () => {
    assert.throws(() => classifyMedia({ format: 'jpeg' }), /dimensions/i);
  });
});

describe('instagram caption', () => {
  const payload = {
    title: 'Agilent 1260 Infinity II HPLC System',
    description: 'Refurbished quaternary HPLC with diode array detection.',
    tags: ['hplc', 'agilent', 'refurbished instruments'],
  };

  it('leads with the title and includes the detail', () => {
    const caption = buildCaption(payload, DEFAULT_BRANDING);
    assert.ok(caption.startsWith(payload.title));
    assert.ok(caption.includes('diode array'));
  });

  it('includes contact details from branding', () => {
    const caption = buildCaption(payload, DEFAULT_BRANDING);
    assert.ok(caption.includes(DEFAULT_BRANDING.contact.website));
  });

  it('converts tags to valid hashtags and strips punctuation', () => {
    const caption = buildCaption(payload, DEFAULT_BRANDING);
    assert.ok(caption.includes('#hplc'));
    assert.ok(caption.includes('#refurbishedinstruments'), 'spaces must be removed');
    assert.ok(!/#\s/.test(caption), 'no empty hashtags');
  });

  it('caps hashtags at Instagram\'s limit of 30', () => {
    const many = { ...payload, tags: Array.from({ length: 60 }, (_, i) => `tag${i}`) };
    const hashtags = buildCaption(many, DEFAULT_BRANDING).match(/#\w+/g) ?? [];
    assert.ok(hashtags.length <= 30, `got ${hashtags.length}`);
  });

  it('stays within the 2200 character caption limit', () => {
    const long = { ...payload, description: 'x'.repeat(5000) };
    assert.ok(buildCaption(long, DEFAULT_BRANDING).length <= 2200);
  });

  it('survives a payload with no tags or description', () => {
    const caption = buildCaption({ title: 'Bare' }, DEFAULT_BRANDING);
    assert.ok(caption.includes('Bare'));
  });
});

describe('instagram configuration guard', () => {
  it('reports unconfigured when credentials are absent', () => {
    // Nothing is set in the test environment, so this must be false — the
    // publisher refuses rather than calling the API with an empty token.
    assert.equal(instagramConfigured(), false);
  });
});
