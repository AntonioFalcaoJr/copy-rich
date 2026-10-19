import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCfHtml, readCfHtmlFragment } from '../skills/copy-rich/scripts/lib/cfhtml.mjs';

const num = (payload, key) => parseInt(payload.match(new RegExp(`${key}:(\\d+)`))[1], 10);

test('offsets point at the right bytes for ASCII', () => {
  const p = buildCfHtml('<p>hi</p>');
  const buf = Buffer.from(p, 'utf8');
  assert.equal(buf.subarray(num(p, 'StartFragment'), num(p, 'EndFragment')).toString(), '<p>hi</p>');
  assert.equal(num(p, 'EndHTML'), buf.length);
});

test('offsets are byte offsets, not character offsets (accents, emoji)', () => {
  const fragment = '<p>ação — 🚀 ção</p>';
  const p = buildCfHtml(fragment);
  const buf = Buffer.from(p, 'utf8');
  assert.equal(num(p, 'EndHTML'), buf.length);
  assert.equal(readCfHtmlFragment(buf), fragment);
});

test('StartHTML points at <html>', () => {
  const p = buildCfHtml('x');
  assert.ok(Buffer.from(p, 'utf8').subarray(num(p, 'StartHTML')).toString().startsWith('<html>'));
});
