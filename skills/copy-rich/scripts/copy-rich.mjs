#!/usr/bin/env node
// copy-rich: put Markdown on the clipboard as rich text, ready to paste into Slack, Teams, email or docs.
//
//   copy-rich.mjs [slack|teams|html] [turn] [--file <path>|-] [--session <id>] [--print] [--soft]
//
// Source of the Markdown, in order: --file / stdin, else the last Claude reply in the session transcript.

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { writeClipboard } from './lib/clipboard.mjs';
import { findTranscript, parseTurns, pickReply } from './lib/transcript.mjs';
import { markdownToHtml } from './lib/markdown.mjs';

const TARGETS = new Set(['html', 'teams', 'slack']);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: 'string', short: 't' },
    file: { type: 'string', short: 'f' },
    session: { type: 'string' },
    turn: { type: 'boolean' },
    print: { type: 'boolean' },
    soft: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log('usage: copy-rich [slack|teams|html] [turn] [--file <path>|-] [--session <id>] [--print] [--soft]');
  process.exit(0);
}

function sourceMarkdown() {
  if (values.file) return { md: fs.readFileSync(values.file === '-' ? 0 : values.file, 'utf8'), from: values.file === '-' ? 'stdin' : values.file };
  const transcript = findTranscript({ sessionId: values.session });
  if (!transcript) throw new Error('No Claude Code session transcript found. Pass --file or pipe Markdown on stdin.');
  const md = pickReply(parseTurns(fs.readFileSync(transcript, 'utf8')), { wholeTurn: values.turn || positionals.includes('turn') });
  if (!md) throw new Error('No assistant reply found in this session yet.');
  return { md, from: 'last reply' };
}

try {
  const target = values.target ?? positionals.find((p) => TARGETS.has(p)) ?? 'html';
  if (!TARGETS.has(target)) throw new Error(`Unknown target "${target}". Use slack, teams or html.`);

  const { md, from } = sourceMarkdown();
  const html = markdownToHtml(md, { target });

  if (values.print) {
    console.log(html);
  } else {
    const method = writeClipboard(html, md);
    const links = (html.match(/<a href=/g) ?? []).length;
    console.log(`copy-rich: copied ${md.length} chars from ${from} as rich text (${target}, ${links} link${links === 1 ? '' : 's'}) via ${method}. Paste with Ctrl+V / Cmd+V.`);
  }
} catch (err) {
  console.log(`copy-rich: ERROR ${err.message}`);
  process.exit(values.soft ? 0 : 1);
}
