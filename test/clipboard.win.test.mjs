// Integration test: writes to the real Windows clipboard and reads the raw bytes back through the Win32 API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeClipboard } from '../skills/copy-rich/scripts/lib/clipboard.mjs';
import { readCfHtmlFragment } from '../skills/copy-rich/scripts/lib/cfhtml.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('CF_HTML round-trips through the real clipboard with accents and emoji', { skip: process.platform !== 'win32' }, () => {
  const html = '<p>ação — 🚀 <a href="https://example.com/?a=1&amp;b=2">link</a></p>';
  const text = 'ação — 🚀 [link](https://example.com/?a=1&b=2)';
  writeClipboard(html, text);

  const r = spawnSync('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(here, 'helpers', 'read-clipboard.ps1')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(r.stdout.replace(/^﻿/, ''));

  const raw = Buffer.from(got.html, 'base64');
  const end = raw.indexOf(0);
  assert.equal(readCfHtmlFragment(end > 0 ? raw.subarray(0, end) : raw), html);
  assert.equal(got.text, text);
});
