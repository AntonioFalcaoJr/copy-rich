// Small dependency-free Markdown -> HTML converter, tuned for pasting into chat apps.
// Covers what an LLM reply usually contains: headings, emphasis, links, lists (nested),
// fenced code, blockquotes, tables, rules. Everything else is escaped, never passed through.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/|\.\.?\/)/i;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const TABLE_DELIM = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

const indentOf = (l) => l.match(/^\s*/)[0].length;

// ---------- inline ----------

function emphasis(s) {
  return s
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\w)__(?=\S)([\s\S]*?\S)__(?!\w)/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!\w)_(?=\S)([\s\S]*?\S)_(?!\w)/g, '<em>$1</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
}

export function inline(src) {
  const stash = [];
  const hold = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  const anchor = (url, innerHtml) =>
    SAFE_URL.test(url) ? hold(`<a href="${url}">${innerHtml}</a>`) : innerHtml;

  let s = src.replace(/\u0000/g, '');
  s = s.replace(/(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => hold(`<code>${esc(code.trim())}</code>`));
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, (_, ch) => hold(esc(ch)));
  s = s.replace(/<(https?:\/\/[^\s<>]+)>/g, (_, url) => anchor(esc(url), esc(url)));
  s = esc(s);

  // [text](url "title") and ![alt](url)
  s = s.replace(
    /(!?)\[((?:[^[\]]|\[[^\]]*\])*)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;[^&]*?&quot;)?\s*\)/g,
    (_, bang, text, url) => anchor(url, emphasis(text || url)),
  );
  // bare URLs
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])/g, (_, pre, url) => pre + anchor(url, url));

  s = emphasis(s);
  s = s.replace(/ {2,}\n|\n/g, '<br>');
  while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[+n]);
  return s;
}

// ---------- blocks ----------

const isListItem = (l) => LIST_ITEM.test(l) && !RULE.test(l);

function isTableStart(lines, i) {
  return i + 1 < lines.length && lines[i].includes('|') && TABLE_DELIM.test(lines[i + 1]) && lines[i + 1].includes('-');
}

function isBlockStart(lines, i) {
  const l = lines[i];
  return FENCE.test(l) || HEADING.test(l) || RULE.test(l) || /^\s{0,3}>/.test(l) || isListItem(l) || isTableStart(lines, i);
}

function splitRow(line) {
  const cells = [];
  let cur = '';
  let inCode = false;
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, (m, off, str) => (str.endsWith('\\|') ? m : ''));
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (c === '`') inCode = !inCode;
    if (c === '\\' && t[k + 1] === '|') { cur += '|'; k++; continue; }
    if (c === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

const plain = (md) => md.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '');

function renderTable(header, aligns, rows, opts) {
  if (opts.target === 'slack') {
    const all = [header, ...rows];
    const widths = header.map((_, c) => Math.max(...all.map((r) => [...plain(r[c] ?? '')].length)));
    const line = (r) => r.map((cell, c) => plain(cell ?? '').padEnd(widths[c])).join('  ').trimEnd();
    const sep = widths.map((w) => '-'.repeat(w)).join('  ');
    return `<pre>${esc([line(header), sep, ...rows.map(line)].join('\n'))}</pre>`;
  }
  const cell = (tag, md, c) => {
    const a = aligns[c] ? `text-align:${aligns[c]};` : '';
    return `<${tag} style="${a}border:1px solid #ccc;padding:4px 8px">${inline(md ?? '')}</${tag}>`;
  };
  const head = `<thead><tr>${header.map((h, c) => cell('th', h, c)).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map((r) => `<tr>${header.map((_, c) => cell('td', r[c], c)).join('')}</tr>`).join('')}</tbody>`;
  return `<table style="border-collapse:collapse">${head}${body}</table>`;
}

function parseList(lines, i, opts) {
  const first = lines[i].match(LIST_ITEM);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const start = ordered ? parseInt(first[2], 10) : 1;
  const items = [];

  while (i < lines.length) {
    const m = lines[i].match(LIST_ITEM);
    if (!m || m[1].length > baseIndent + 1 || m[1].length < baseIndent || RULE.test(lines[i])) break;
    const contentIndent = m[1].length + m[2].length + 1;
    const content = [m[3]];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (!l.trim()) {
        let k = j + 1;
        while (k < lines.length && !lines[k].trim()) k++;
        if (k < lines.length && indentOf(lines[k]) > baseIndent + 1) { content.push(''); j++; continue; }
        break;
      }
      const ind = indentOf(l);
      if (ind > baseIndent + 1) { content.push(l.slice(Math.min(ind, contentIndent))); j++; continue; }
      if (isBlockStart(lines, j)) break;
      if (content[content.length - 1].trim()) { content.push(l.trim()); j++; continue; }
      break;
    }
    i = j;

    let task = '';
    const t = content[0].match(/^\[([ xX])\]\s+(.*)$/);
    if (t) { task = t[1] === ' ' ? '☐ ' : '☑ '; content[0] = t[2]; }

    const blocks = parseBlocks(content, opts);
    const inner = blocks
      .map((b, idx) => (idx === 0 && b.p ? (task ? task + b.html.slice(3, -4) : b.html.slice(3, -4)) : b.html))
      .join('');
    items.push(`<li>${inner || task}</li>`);

    let k = i;
    while (k < lines.length && !lines[k].trim()) k++;
    if (k < lines.length && k > i && LIST_ITEM.test(lines[k]) && lines[k].match(LIST_ITEM)[1].length === baseIndent) i = k;
  }

  const tag = ordered ? 'ol' : 'ul';
  const attr = ordered && start !== 1 ? ` start="${start}"` : '';
  return { html: `<${tag}${attr}>${items.join('')}</${tag}>`, next: i };
}

function parseBlocks(lines, opts) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;

    if ((m = line.match(FENCE))) {
      const [, ind, marker] = m;
      const body = [];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.length >= marker.length && t[0] === marker[0] && /^[`~]+$/.test(t)) { i++; break; }
        body.push(lines[i].slice(Math.min(ind.length, indentOf(lines[i]))));
        i++;
      }
      out.push({ html: `<pre style="background:#f6f8fa;padding:8px;font-family:Consolas,monospace"><code>${esc(body.join('\n'))}</code></pre>` });
      continue;
    }

    if ((m = line.match(HEADING))) {
      const level = m[1].length;
      out.push({ html: opts.target === 'slack' ? `<p><strong>${inline(m[2])}</strong></p>` : `<h${level}>${inline(m[2])}</h${level}>` });
      i++;
      continue;
    }

    if (RULE.test(line)) { out.push({ html: '<hr>' }); i++; continue; }

    if (/^\s{0,3}>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) body.push(lines[i++].replace(/^\s{0,3}> ?/, ''));
      const inner = parseBlocks(body, opts).map((b) => b.html).join('');
      out.push({ html: `<blockquote>${inner}</blockquote>` });
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i]);
      const aligns = splitRow(lines[i + 1]).map((d) => (/^:-+:$/.test(d) ? 'center' : /-+:$/.test(d) ? 'right' : /^:-+/.test(d) ? 'left' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
      out.push({ html: renderTable(header, aligns, rows, opts) });
      continue;
    }

    if (isListItem(line)) {
      const r = parseList(lines, i, opts);
      out.push({ html: r.html });
      i = r.next;
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) para.push(lines[i++].trim());
    out.push({ html: `<p>${inline(para.join('\n'))}</p>`, p: true });
  }
  return out;
}

/**
 * Finds the Markdown blockquotes of a reply (top level, outside fenced code) and returns the LAST one with one
 * level of `>` stripped and paragraph breaks kept. Used so that "intro, quoted message, closing note" copies only
 * the message. Same block rule as parseBlocks: a quote is a run of consecutive lines starting with `>` (up to 3
 * spaces of indent). Returns null when the reply has no non-empty blockquote; `count` is how many it has.
 */
export function extractLastQuote(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const quotes = [];
  let fence = null;
  let run = null;
  const flush = () => {
    if (run) {
      while (run.length && !run[0].trim()) run.shift();
      while (run.length && !run[run.length - 1].trim()) run.pop();
      if (run.length) quotes.push(run.join('\n'));
    }
    run = null;
  };
  for (const line of lines) {
    if (fence) {
      const t = line.trim();
      if (t.length >= fence.length && t[0] === fence[0] && /^[`~]+$/.test(t)) fence = null;
      continue;
    }
    if (/^\s{0,3}>/.test(line)) {
      (run ??= []).push(line.replace(/^\s{0,3}> ?/, ''));
      continue;
    }
    flush();
    const f = line.match(FENCE);
    if (f) fence = f[2];
  }
  flush();
  return quotes.length ? { markdown: quotes.at(-1), count: quotes.length } : null;
}

/**
 * @param {string} markdown
 * @param {{target?: 'html' | 'teams' | 'slack'}} [options]
 */
export function markdownToHtml(markdown, options = {}) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines, { target: options.target ?? 'html' }).map((b) => b.html).join('\n');
}
