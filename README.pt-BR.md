# copy-rich

Copia a última resposta do Claude Code para a área de transferência como **rich text**, para que links, negrito, listas e tabelas sobrevivam ao colar no Slack, Teams, e-mail ou Google Docs.

[English](README.md)

## Por quê

O terminal entrega Markdown. Colar Markdown no Teams ou no Slack mostra `**` e `[texto](url)` literais. O `copy-rich` coloca HTML de verdade no clipboard, com o Markdown como texto simples de reserva.

Ele lê o Markdown original da transcrição da sessão e roda como script, então o modelo não reescreve a resposta. A cópia não gasta tokens e as aspas do shell não estragam o texto.

## Instalação

Como plugin (chamado com `/copy-rich:copy-rich`):

```
/plugin marketplace add AntonioFalcaoJr/copy-rich
/plugin install copy-rich@copy-rich
```

Ou como skill avulsa (chamada com `/copy-rich`):

```bash
git clone https://github.com/AntonioFalcaoJr/copy-rich
cp -r copy-rich/skills/copy-rich ~/.claude/skills/
```

Precisa de Node 18+.

## Uso

```
/copy-rich            copia a última resposta
/copy-rich slack      perfil Slack: títulos viram negrito, tabelas viram texto alinhado
/copy-rich teams      igual a html
/copy-rich turn       junta todos os blocos de texto do último turno
```

Depois é só colar com Ctrl+V / Cmd+V. Rodar de novo copia a mesma resposta, não a mensagem de confirmação.

Também funciona com qualquer arquivo Markdown fora do Claude Code:

```bash
node skills/copy-rich/scripts/copy-rich.mjs --file notas.md slack
node skills/copy-rich/scripts/copy-rich.mjs --file notas.md --print   # mostra o HTML sem tocar no clipboard
```

## Plataformas

| SO | Mecanismo | Status |
|---|---|---|
| Windows | PowerShell 5.1, `CF_HTML` (UTF-8, offsets em bytes) + texto Unicode | Testado de ponta a ponta no Claude Code |
| macOS | `osascript` (JXA) com HTML + RTF + texto | Escrito, **não testado** em Mac |
| Linux | `wl-copy` ou `xclip`, só `text/html` | Escrito, **não testado** |
| WSL | Chama `powershell.exe` | Escrito, **não testado** |

O conteúdo do clipboard é verificado. Como o Slack e o Teams renderizam o que é colado depende desses apps. Issues com detalhes são bem-vindas, principalmente de macOS e Linux.

## Licença

MIT
