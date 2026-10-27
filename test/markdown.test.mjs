import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml as md, extractLastQuote } from '../skills/copy-rich/scripts/lib/markdown.mjs';

test('paragraph with emphasis, code and link', () => {
  assert.equal(
    md('Hi **bold**, _it_, `x<y` and [site](https://a.com/p?q=1&r=2).'),
    '<p>Hi <strong>bold</strong>, <em>it</em>, <code>x&lt;y</code> and <a href="https://a.com/p?q=1&amp;r=2">site</a>.</p>',
  );
});

test('bare URLs become links without swallowing trailing punctuation', () => {
  assert.equal(md('See https://example.com/a.'), '<p>See <a href="https://example.com/a">https://example.com/a</a>.</p>');
});

test('links with parentheses in the URL', () => {
  assert.match(md('[w](https://en.wikipedia.org/wiki/Foo_(bar))'), /href="https:\/\/en\.wikipedia\.org\/wiki\/Foo_\(bar\)"/);
});

test('javascript: links are never emitted as anchors', () => {
  const html = md('[x](javascript:alert(1))');
  assert.ok(!html.includes('<a '));
  assert.ok(html.includes('x'));
});

test('raw HTML is escaped, not passed through', () => {
  assert.equal(md('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('headings keep their level, except on slack where they become bold', () => {
  assert.equal(md('## Title'), '<h2>Title</h2>');
  assert.equal(md('## Title', { target: 'slack' }), '<p><strong>Title</strong></p>');
});

test('nested unordered list inside ordered list', () => {
  assert.equal(
    md('1. one\n   - a\n   - b\n2. two'),
    '<ol><li>one<ul><li>a</li><li>b</li></ul></li><li>two</li></ol>',
  );
});

test('nested list with 4-space indent', () => {
  assert.equal(md('- one\n    - deep\n- two'), '<ul><li>one<ul><li>deep</li></ul></li><li>two</li></ul>');
});

test('ordered list keeps its start number', () => {
  assert.equal(md('3. c\n4. d'), '<ol start="3"><li>c</li><li>d</li></ol>');
});

test('task list items get a checkbox glyph', () => {
  assert.equal(md('- [x] done\n- [ ] todo'), '<ul><li>☑ done</li><li>☐ todo</li></ul>');
});

test('fenced code is escaped and not formatted', () => {
  const html = md('```js\nconst a = "<b>" ** 2;\n```');
  assert.ok(html.includes('<code>const a = &quot;&lt;b&gt;&quot; ** 2;</code>'));
  assert.ok(!html.includes('<strong>'));
});

test('fenced code inside a list item stays in the item', () => {
  const html = md('1. step\n   ```\n   run it\n   ```\n2. next');
  assert.match(html, /<li>step<pre[^>]*><code>run it<\/code><\/pre><\/li><li>next<\/li>/);
});

test('blockquote', () => {
  assert.equal(md('> quoted **text**'), '<blockquote><p>quoted <strong>text</strong></p></blockquote>');
});

test('table renders as html table, with alignment', () => {
  const html = md('| A | B |\n|---|--:|\n| 1 | 2 |');
  assert.match(html, /<th style="border:1px solid #ccc;padding:4px 8px">A<\/th>/);
  assert.match(html, /<td style="text-align:right;[^"]*">2<\/td>/);
});

test('table on slack becomes aligned preformatted text', () => {
  const html = md('| Name | N |\n|---|---|\n| **ab** | 1 |', { target: 'slack' });
  assert.equal(html, '<pre>Name  N\n----  -\nab    1</pre>');
});

test('single newlines inside a paragraph become <br>', () => {
  assert.equal(md('a\nb'), '<p>a<br>b</p>');
});

test('horizontal rule is not a list', () => {
  assert.equal(md('a\n\n---\n\nb'), '<p>a</p>\n<hr>\n<p>b</p>');
});

test('escaped markdown characters stay literal', () => {
  assert.equal(md('\\*not italic\\*'), '<p>*not italic*</p>');
});

test('accents and emoji pass through untouched', () => {
  assert.equal(md('ação — 🚀'), '<p>ação — 🚀</p>');
});

test('underscores inside words are not emphasis', () => {
  assert.equal(md('snake_case_name'), '<p>snake_case_name</p>');
});

test('extractLastQuote returns only the quoted message, markers stripped, paragraphs kept', () => {
  const reply = 'Intro line:\n\n> First paragraph with [a link](https://example.com).\n>\n> Second paragraph.\n\nClosing note.';
  const q = extractLastQuote(reply);
  assert.equal(q.count, 1);
  assert.equal(q.markdown, 'First paragraph with [a link](https://example.com).\n\nSecond paragraph.');
  assert.equal(md(q.markdown), '<p>First paragraph with <a href="https://example.com">a link</a>.</p>\n<p>Second paragraph.</p>');
});

test('extractLastQuote takes the last of several quotes and reports the count', () => {
  const q = extractLastQuote('> Draft A\n\nbetween\n\n> Draft B');
  assert.deepEqual(q, { markdown: 'Draft B', count: 2 });
});

test('extractLastQuote ignores > inside fenced code and returns null without a quote', () => {
  assert.equal(extractLastQuote('```\n> not a quote\n```\n\nplain'), null);
  assert.equal(extractLastQuote('no quote here'), null);
});
