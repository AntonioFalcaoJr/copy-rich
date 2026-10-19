# copy-rich

Copy Claude Code's last reply to the clipboard as **rich text**, so links, bold, lists and tables survive when you paste into Slack, Teams, email or Google Docs.

[Português](README.pt-BR.md)

## Why

The terminal gives you Markdown. Pasting Markdown into Teams or Slack gives you literal `**` and `[text](url)`. `copy-rich` puts real HTML on the clipboard instead, with the Markdown as the plain-text fallback.

It reads Claude's original Markdown from the session transcript and runs as a script, so the model never retypes the reply. No tokens are spent on the copy and nothing gets mangled by shell quoting.

## Install

As a plugin (invoked as `/copy-rich:copy-rich`):

```
/plugin marketplace add AntonioFalcaoJr/copy-rich
/plugin install copy-rich@copy-rich
```

Or as a plain skill (invoked as `/copy-rich`):

```bash
git clone https://github.com/AntonioFalcaoJr/copy-rich
cp -r copy-rich/skills/copy-rich ~/.claude/skills/
```

Requires Node 18+ (already there if you run Claude Code from npm; otherwise install Node).

## Use

```
/copy-rich            copy the last reply
/copy-rich slack      Slack profile: headings become bold, tables become aligned text
/copy-rich teams      same as html
/copy-rich turn       join every text block of the last turn, not just the last one
```

Then paste with Ctrl+V / Cmd+V. Running it again copies the same reply, not its own confirmation message.

It also works on any Markdown file outside Claude Code:

```bash
node skills/copy-rich/scripts/copy-rich.mjs --file notes.md slack
cat notes.md | node skills/copy-rich/scripts/copy-rich.mjs --file -
node skills/copy-rich/scripts/copy-rich.mjs --file notes.md --print   # show the HTML, don't touch the clipboard
```

## What is supported

Headings, bold, italic, strikethrough, inline code, links and bare URLs, nested ordered/unordered/task lists, fenced code, blockquotes, tables, rules. Raw HTML in the Markdown is escaped, and `javascript:` links are dropped.

## Platforms

| OS | Mechanism | Status |
|---|---|---|
| Windows | PowerShell 5.1, `CF_HTML` (UTF-8, byte offsets) + Unicode text | Tested end to end in Claude Code. The raw clipboard bytes are checked in the test suite. |
| macOS | `osascript` (JXA) writing HTML + RTF + text | Written, **not tested** on a Mac |
| Linux | `wl-copy` or `xclip`, `text/html` only | Written, **not tested** |
| WSL | Calls `powershell.exe` | Written, **not tested** |

The clipboard contents are verified; how Slack and Teams render a paste is up to those apps, and I have not checked every client version. Issues with details are welcome, especially from macOS and Linux.

## Develop

```bash
npm test      # Node 21+ (uses a glob in node --test)
```

The code lives in `skills/copy-rich/scripts/`: `lib/markdown.mjs` (converter), `lib/transcript.mjs` (finds the reply), `lib/cfhtml.mjs` (Windows payload), `lib/clipboard.mjs` plus `clip.ps1` / `clip.jxa.js` (per-OS writers).

## Related projects

[copyas](https://github.com/gdalyy/copyas) (more destinations, Linux focus) and [md2cb](https://github.com/letientai299/md2cb) (Rust CLI, not tied to Claude Code) solve nearby problems.

## License

MIT
