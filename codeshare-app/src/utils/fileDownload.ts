/**
 * Robust cross-browser file download engine.
 * Solves browser network download errors by creating binary Blob URLs
 * and preventing premature revokeObjectURL cancellation.
 */

import type { AttachedMedia } from '../types';

export function dataUrlToBinaryBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid or empty file data');
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Download an attached media file safely
 */
export async function downloadAttachedMediaFile(media: AttachedMedia): Promise<void> {
  if (!media.dataUrl || media.dataUrl.length < 50) {
    throw new Error(`File "${media.name}" is still decrypting or data is unavailable.`);
  }

  const blob = dataUrlToBinaryBlob(media.dataUrl, media.mimeType);
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = media.name;
  document.body.appendChild(link);
  link.click();

  // Wait 3 seconds before revoking to give browser download process time to finish reading the stream
  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  }, 3000);
}

/**
 * Download code text as a source file safely
 */
export function downloadCodeText(code: string, fileName: string): void {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  }, 3000);
}
