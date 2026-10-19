# Puts HTML (CF_HTML) and plain text on the Windows clipboard.
# Both files are UTF-8; the HTML file already holds the complete CF_HTML payload.
param(
  [Parameter(Mandatory)][string]$HtmlFile,
  [Parameter(Mandatory)][string]$TextFile
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$utf8 = New-Object System.Text.UTF8Encoding($false)
$html = [IO.File]::ReadAllText($HtmlFile, $utf8)
$text = [IO.File]::ReadAllText($TextFile, $utf8)

$data = New-Object System.Windows.Forms.DataObject
$data.SetData([System.Windows.Forms.DataFormats]::Html, $html)
$data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $text)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
