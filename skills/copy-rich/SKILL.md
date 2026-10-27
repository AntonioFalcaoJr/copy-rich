---
name: copy-rich
description: Copy Claude's last reply to the clipboard as rich text (HTML) so links, bold, lists and tables survive when pasted into Slack, Teams, email or docs. Run it as /copy-rich, optionally with a target (slack, teams, html) or "turn" for every text block of the last turn. If the reply has a Markdown blockquote (lines starting with >), only the last blockquote is copied, without the > markers; add "full" to copy the whole reply instead.
argument-hint: "[slack|teams|html] [turn] [full]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

!`node "${CLAUDE_SKILL_DIR}/scripts/copy-rich.mjs" --soft --session "${CLAUDE_SESSION_ID}" $ARGUMENTS`

The line above is the result of copying the last reply to the clipboard. Tell the user what it says in one short sentence, in their language, and say so if it reports "quoted block only" (only the quoted message was copied, not the rest of the reply). Do not run any other command, and do not repeat the copied content. If the line starts with `copy-rich: ERROR`, show the error and nothing else.
