// Reads Claude's original Markdown from the Claude Code session transcript (JSONL),
// so the model never has to re-type its own reply into a shell command.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OWN_PROMPT = [
  /<command-name>\/?(?:copy-rich:)?copy-rich<\/command-name>/,
  /Base directory for this skill:[^\n]*copy-rich/,
];

export const configDir = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const encodeCwd = (cwd) => cwd.replace(/[^a-zA-Z0-9]/g, '-');

export function findTranscript({ sessionId, cwd = process.cwd() } = {}) {
  const root = path.join(configDir(), 'projects');
  if (!fs.existsSync(root)) return null;
  const dirs = fs.readdirSync(root).map((d) => path.join(root, d)).filter((d) => fs.statSync(d).isDirectory());

  if (sessionId) {
    for (const d of dirs) {
      const f = path.join(d, `${sessionId}.jsonl`);
      if (fs.existsSync(f)) return f;
    }
    return null;
  }

  const newest = (list) =>
    list
      .flatMap((d) => fs.readdirSync(d).filter((n) => n.endsWith('.jsonl')).map((n) => path.join(d, n)))
      .map((f) => ({ f, t: fs.statSync(f).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0]?.f ?? null;

  const own = dirs.filter((d) => path.basename(d) === encodeCwd(cwd));
  return newest(own) ?? newest(dirs);
}

const textOf = (content) =>
  typeof content === 'string'
    ? content
    : (content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

/** Splits a transcript into turns: one per real user prompt, with the assistant text blocks that followed it. */
export function parseTurns(jsonl) {
  const turns = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let x;
    try { x = JSON.parse(line); } catch { continue; }
    if (x.isSidechain) continue;

    if (x.type === 'user') {
      const content = x.message?.content;
      if (Array.isArray(content) && content.some((b) => b.type === 'tool_result')) continue;
      const prompt = textOf(content);
      turns.push({ own: OWN_PROMPT.some((re) => re.test(prompt)), texts: [] });
    } else if (x.type === 'assistant') {
      const text = textOf(x.message?.content).trim();
      if (!text) continue;
      if (!turns.length) turns.push({ own: false, texts: [] });
      turns.at(-1).texts.push(text);
    }
  }
  return turns;
}

/**
 * The reply to copy: the last assistant text that is not a reply to a /copy-rich call itself.
 * `wholeTurn` joins every text block of that turn instead of only the last one.
 */
export function pickReply(turns, { wholeTurn = false } = {}) {
  const turn = turns.filter((t) => !t.own && t.texts.length).at(-1);
  if (!turn) return null;
  return wholeTurn ? turn.texts.join('\n\n') : turn.texts.at(-1);
}
