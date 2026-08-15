import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchAdmin, ADMIN_SEARCH_INDEX } from '@/lib/admin-search';

const top = (query: string) => searchAdmin(query)[0]?.title;

test('every entry has somewhere to go and something to say', () => {
  for (const entry of ADMIN_SEARCH_INDEX) {
    assert.ok(entry.title.length > 0, 'title');
    assert.match(entry.href, /^\/admin/, `${entry.title}: href must be an admin route`);
    assert.ok(entry.description.length > 0, `${entry.title}: description`);
    assert.ok(entry.keywords.length > 0, `${entry.title}: needs keywords, the title alone is not enough`);
  }
});

test('no two entries point at the same place', () => {
  const hrefs = ADMIN_SEARCH_INDEX.map((entry) => entry.href);
  assert.equal(new Set(hrefs).size, hrefs.length, 'duplicate href — one of them will never be chosen');
});

test('the search that started this finds something', () => {
  // "password reset" returned nothing, which reads as "this software cannot
  // do that" rather than "you searched the catalogue".
  const results = searchAdmin('password reset');
  assert.ok(results.length > 0, 'password reset must find something');
  assert.equal(results[0].title, 'Employees');
});

test('people find pages by what they call them, not what we called them', () => {
  assert.equal(top('colour'), 'Theme');
  assert.equal(top('logo'), 'Theme');
  assert.equal(top('font'), 'Theme');
  assert.equal(top('fingerprint'), 'Biometric devices');
  assert.equal(top('thumb'), 'Biometric devices');
  assert.equal(top('hazri'), 'Attendance');
  assert.equal(top('chutti'), 'Leave');
  assert.equal(top('complaint'), 'Service requests');
  assert.equal(top('vendor'), 'Suppliers');
  assert.equal(top('whatsapp'), 'Business settings');
  assert.equal(top('who changed'), 'Activity log');
  assert.equal(top('csv'), 'Bulk Import');
  assert.equal(top('excel'), 'Bulk Import');
  assert.equal(top('spreadsheet'), 'Bulk Import');
  assert.equal(top('fill data'), 'Bulk Import');
});

test('an exact title wins over a mention elsewhere', () => {
  // "Products" appears in several descriptions; the page itself must come
  // first or the ranking is worse than useless.
  assert.equal(top('products'), 'Products');
  assert.equal(top('inventory'), 'Inventory');
  assert.equal(top('quotes'), 'Quotes');
});

test('extra words narrow the search rather than widening it', () => {
  const employees = searchAdmin('employee');
  const addEmployee = searchAdmin('add employee');

  assert.ok(addEmployee.length > 0);
  assert.ok(addEmployee.length < employees.length, 'a second word must filter, not add');
  assert.equal(addEmployee[0].title, 'Add an employee');
});

test('a term that matches nothing rules the entry out entirely', () => {
  // Otherwise "add employee" would return every page mentioning "add".
  assert.deepEqual(searchAdmin('employee zzzznothing'), []);
});

test('case and stray spacing do not matter', () => {
  assert.equal(top('  THEME  '), 'Theme');
  assert.equal(top('BiOmEtRiC'), 'Biometric devices');
});

test('an empty query returns nothing rather than everything', () => {
  assert.deepEqual(searchAdmin(''), []);
  assert.deepEqual(searchAdmin('   '), []);
});

test('results keep a stable order between equal scores', () => {
  // A list that reshuffles under the cursor is worse than one that is merely
  // imperfect — you click the wrong row.
  const once = searchAdmin('setting').map((entry) => entry.href);
  const twice = searchAdmin('setting').map((entry) => entry.href);
  assert.deepEqual(once, twice);
});

test('security settings are found by what people call them', () => {
  assert.equal(top('two step'), 'Security');
  assert.equal(top('2fa'), 'Security');
  assert.equal(top('google authenticator'), 'Security');
  assert.equal(top('otp'), 'Security');
});
