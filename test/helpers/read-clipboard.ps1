# Test helper: dumps the raw bytes of the "HTML Format" clipboard entry (base64) and the Unicode text, as JSON.
$ErrorActionPreference = 'Stop'
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Clip {
  [DllImport("user32.dll")] public static extern bool OpenClipboard(IntPtr h);
  [DllImport("user32.dll")] public static extern bool CloseClipboard();
  [DllImport("user32.dll")] public static extern uint RegisterClipboardFormat(string n);
  [DllImport("user32.dll")] public static extern IntPtr GetClipboardData(uint f);
  [DllImport("kernel32.dll")] public static extern IntPtr GlobalLock(IntPtr h);
  [DllImport("kernel32.dll")] public static extern bool GlobalUnlock(IntPtr h);
  [DllImport("kernel32.dll")] public static extern UIntPtr GlobalSize(IntPtr h);
  public static byte[] Get(uint fmt) {
    if (!OpenClipboard(IntPtr.Zero)) throw new Exception("OpenClipboard failed");
    try {
      IntPtr h = GetClipboardData(fmt); if (h == IntPtr.Zero) return null;
      IntPtr p = GlobalLock(h); int n = (int)GlobalSize(h); byte[] b = new byte[n];
      Marshal.Copy(p, b, 0, n); GlobalUnlock(h); return b;
    } finally { CloseClipboard(); }
  }
}
'@
$html = [Clip]::Get([Clip]::RegisterClipboardFormat('HTML Format'))
$uni = [Clip]::Get(13)  # CF_UNICODETEXT
@{
  html = if ($html) { [Convert]::ToBase64String($html) } else { $null }
  text = if ($uni) { [Text.Encoding]::Unicode.GetString($uni).TrimEnd([char]0) } else { $null }
} | ConvertTo-Json -Compress
