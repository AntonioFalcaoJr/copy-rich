// Builds the Windows "HTML Format" (CF_HTML) clipboard payload.
// Offsets are byte offsets into the UTF-8 encoded payload, so they must be computed on bytes, not characters.

const START = '<html><body>\r\n<!--StartFragment-->';
const END = '<!--EndFragment-->\r\n</body></html>';

const pad = (n) => String(n).padStart(10, '0');
const header = (a, b, c, d) =>
  `Version:0.9\r\nStartHTML:${pad(a)}\r\nEndHTML:${pad(b)}\r\nStartFragment:${pad(c)}\r\nEndFragment:${pad(d)}\r\n`;

export function buildCfHtml(fragment) {
  const bytes = (s) => Buffer.byteLength(s, 'utf8');
  const startHtml = bytes(header(0, 0, 0, 0));
  const startFragment = startHtml + bytes(START);
  const endFragment = startFragment + bytes(fragment);
  const endHtml = endFragment + bytes(END);
  return header(startHtml, endHtml, startFragment, endFragment) + START + fragment + END;
}

/** Reads the fragment back out of a CF_HTML payload. Used by tests and for verification. */
export function readCfHtmlFragment(payload) {
  const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const head = buf.subarray(0, 200).toString('latin1');
  const get = (k) => parseInt(head.match(new RegExp(`${k}:(\\d+)`))[1], 10);
  return buf.subarray(get('StartFragment'), get('EndFragment')).toString('utf8');
}
