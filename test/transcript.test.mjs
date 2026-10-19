import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTurns, pickReply } from '../skills/copy-rich/scripts/lib/transcript.mjs';

const user = (content, extra = {}) => JSON.stringify({ type: 'user', message: { role: 'user', content }, ...extra });
const asst = (...blocks) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: blocks } });
const text = (t) => ({ type: 'text', text: t });
const lines = (...l) => l.join('\n');

test('picks the last text block of the last turn', () => {
  const t = parseTurns(lines(user('q1'), asst(text('first')), user('q2'), asst(text('before tool')), asst({ type: 'tool_use' }), asst(text('final **answer**'))));
  assert.equal(pickReply(t), 'final **answer**');
});

test('wholeTurn joins every text block of the turn', () => {
  const t = parseTurns(lines(user('q'), asst(text('a')), asst({ type: 'tool_use' }), asst(text('b'))));
  assert.equal(pickReply(t, { wholeTurn: true }), 'a\n\nb');
});

test('tool results do not start a new turn', () => {
  const t = parseTurns(lines(user('q'), asst(text('a')), user([{ type: 'tool_result', content: 'x' }]), asst(text('b'))));
  assert.equal(t.length, 1);
  assert.equal(pickReply(t, { wholeTurn: true }), 'a\n\nb');
});

test('replies to /copy-rich itself are skipped, so repeated runs copy the same message', () => {
  const t = parseTurns(lines(
    user('write it'), asst(text('the message')),
    user('<command-name>/copy-rich</command-name>\n<command-args></command-args>'), asst(text('Copied!')),
    user('<command-name>/copy-rich:copy-rich</command-name>'), asst(text('Copied again!')),
  ));
  assert.equal(pickReply(t), 'the message');
});

test('works when the current /copy-rich prompt is not in the transcript yet', () => {
  const t = parseTurns(lines(user('write it'), asst(text('the message'))));
  assert.equal(pickReply(t), 'the message');
});

test('sidechain (subagent) messages are ignored', () => {
  const t = parseTurns(lines(user('q'), asst(text('main')), JSON.stringify({ type: 'assistant', isSidechain: true, message: { content: [text('sub')] } })));
  assert.equal(pickReply(t), 'main');
});

test('thinking-only and empty messages are ignored', () => {
  const t = parseTurns(lines(user('q'), asst(text('real')), asst({ type: 'thinking', thinking: 'hmm' }), asst(text('  '))));
  assert.equal(pickReply(t), 'real');
});

test('returns null when there is no assistant text', () => {
  assert.equal(pickReply(parseTurns(user('hello'))), null);
});

test('tolerates garbage lines', () => {
  const t = parseTurns(lines('not json', user('q'), '{broken', asst(text('ok'))));
  assert.equal(pickReply(t), 'ok');
});
