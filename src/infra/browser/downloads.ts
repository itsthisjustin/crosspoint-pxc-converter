export function triggerDownload(bytes: Uint8Array, filename: string, mime: string): void {
  const payload = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([payload], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // WebKit can resolve the blob after click() returns. Immediate revocation can cancel
    // the download; keep it alive briefly and still release the backing memory.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
