import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCfHtml } from './cfhtml.mjs';

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const has = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
const isWsl = () => process.platform === 'linux' && /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8'));

function fail(what, r) {
  const detail = (r.stderr?.toString() || r.error?.message || `exit ${r.status}`).trim();
  throw new Error(`${what} failed: ${detail}`);
}

function viaPowerShell(html, text, wsl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-rich-'));
  try {
    const htmlFile = path.join(dir, 'clip.html');
    const textFile = path.join(dir, 'clip.txt');
    fs.writeFileSync(htmlFile, buildCfHtml(html), 'utf8');
    fs.writeFileSync(textFile, text, 'utf8');
    const winPath = (p) => (wsl ? spawnSync('wslpath', ['-w', p], { encoding: 'utf8' }).stdout.trim() : p);
    const r = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', winPath(path.join(scripts, 'clip.ps1')),
        '-HtmlFile', winPath(htmlFile), '-TextFile', winPath(textFile)],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) fail('PowerShell clipboard helper', r);
    return 'powershell (CF_HTML + text)';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function viaMac(html, text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-rich-'));
  try {
    const htmlFile = path.join(dir, 'clip.html');
    const textFile = path.join(dir, 'clip.txt');
    fs.writeFileSync(htmlFile, `<meta charset="utf-8">${html}`, 'utf8');
    fs.writeFileSync(textFile, text, 'utf8');
    // Slack on macOS also wants RTF alongside HTML; textutil ships with the OS.
    const rtfFile = path.join(dir, 'clip.rtf');
    const rtf = spawnSync('textutil', ['-convert', 'rtf', '-format', 'html', '-output', rtfFile, htmlFile], { encoding: 'utf8' });
    const args = ['-l', 'JavaScript', path.join(scripts, 'clip.jxa.js'), htmlFile, textFile];
    if (rtf.status === 0) args.push(rtfFile);
    const r = spawnSync('osascript', args, { encoding: 'utf8' });
    if (r.status !== 0) fail('osascript clipboard helper', r);
    return 'osascript (HTML + RTF + text)';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function viaLinux(html) {
  const tools = [
    ['wl-copy', ['--type', 'text/html'], !!process.env.WAYLAND_DISPLAY],
    ['xclip', ['-selection', 'clipboard', '-t', 'text/html', '-i'], !!process.env.DISPLAY],
    ['wl-copy', ['--type', 'text/html'], true],
  ];
  for (const [cmd, args, usable] of tools) {
    if (!usable || !has(cmd)) continue;
    const r = spawnSync(cmd, args, { input: html, stdio: ['pipe', 'ignore', 'pipe'] });
    if (r.status !== 0) fail(cmd, r);
    return `${cmd} (text/html only)`;
  }
  throw new Error('No clipboard tool found. Install wl-clipboard (Wayland) or xclip (X11).');
}

/** Puts `html` (rich) and `text` (plain fallback) on the system clipboard. Returns a description of the method used. */
export function writeClipboard(html, text) {
  if (process.platform === 'win32') return viaPowerShell(html, text, false);
  if (process.platform === 'darwin') return viaMac(html, text);
  if (isWsl()) return viaPowerShell(html, text, true);
  return viaLinux(html);
}
