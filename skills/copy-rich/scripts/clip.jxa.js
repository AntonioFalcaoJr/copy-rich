// macOS: puts HTML, RTF (optional) and plain text on the general pasteboard.
// Usage: osascript -l JavaScript clip.jxa.js <html-file> <text-file> [rtf-file]
ObjC.import('AppKit');
ObjC.import('Foundation');

function readString(path) {
  return $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
}

function run(argv) {
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  pb.setStringForType(readString(argv[0]), 'public.html');
  if (argv[2]) pb.setDataForType($.NSData.dataWithContentsOfFile($(argv[2])), 'public.rtf');
  pb.setStringForType(readString(argv[1]), $.NSPasteboardTypeString);
}
