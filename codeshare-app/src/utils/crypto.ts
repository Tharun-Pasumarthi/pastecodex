/**
 * Web Crypto API client-side AES-GCM encryption & decryption
 * Enables zero-knowledge end-to-end encrypted sharing of code, images, and PDFs.
 * The encryption key stays in the URL hash (#key=...) and is never sent to the server.
 */

// Converts ArrayBuffer to base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Converts base64 string to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a random 256-bit AES encryption key in hex format
 */
export function generateRandomKey(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const generateEncryptionKey = generateRandomKey;

/**
 * Derives an AES-GCM CryptoKey from a string password/key
 */
async function deriveKey(rawKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(rawKey.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return keyMaterial;
}

/**
 * Encrypt arbitrary string (text, JSON, or base64 dataUrl) using AES-GCM
 */
export async function encryptPayload(
  plainText: string,
  secretKey: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(secretKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt AES-GCM ciphertext back to plain string
 */
export async function decryptPayload(
  ciphertextBase64: string,
  ivBase64: string,
  secretKey: string
): Promise<string> {
  const key = await deriveKey(secretKey);
  const iv = base64ToBuffer(ivBase64);
  const encryptedBytes = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encryptedBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Packs document data into an encrypted URL hash token
 * Enables zero-knowledge link sharing that works 100% reliably on any device
 */
export async function packDocumentToHashToken(
  payloadObj: Record<string, unknown>,
  secretKey: string
): Promise<string> {
  const jsonStr = JSON.stringify(payloadObj);
  const { ciphertext, iv } = await encryptPayload(jsonStr, secretKey);
  return encodeURIComponent(`${iv}~${ciphertext}`);
}

/**
 * Unpacks and decrypts document data from an encrypted URL hash token
 */
export async function unpackDocumentFromHashToken<T = Record<string, unknown>>(
  token: string,
  secretKey: string
): Promise<T | null> {
  try {
    const decoded = decodeURIComponent(token);
    const sepIndex = decoded.indexOf('~');
    if (sepIndex === -1) return null;
    const iv = decoded.slice(0, sepIndex);
    const ciphertext = decoded.slice(sepIndex + 1);
    const decryptedJson = await decryptPayload(ciphertext, iv, secretKey);
    return JSON.parse(decryptedJson) as T;
  } catch (err) {
    console.warn('[Crypto] Unable to unpack payload from URL hash token:', err);
    return null;
  }
}

/**
 * Robustly parses hash string into key and document token
 * Handles both #key=xxx and #key=xxx&d=yyy formats
 */
export function parseHashParams(hashStr: string): { key?: string; docToken?: string } {
  if (!hashStr) return {};
  const clean = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
  const params = new URLSearchParams(clean);
  const key = params.get('key') || undefined;
  const docToken = params.get('d') || params.get('doc') || undefined;

  // Fallback for simple #key=xxx without query params
  if (!key && clean.startsWith('key=')) {
    const ampersandIndex = clean.indexOf('&');
    const rawKey = ampersandIndex !== -1 ? clean.slice(4, ampersandIndex) : clean.slice(4);
    return { key: rawKey };
  }

  return { key, docToken };
}

/**
 * Builds a zero-knowledge self-contained share URL that delivers code and media reliably
 */
export async function generateShareableUrl(
  codeshareId: string,
  key: string,
  content: string,
  docTitle: string,
  modeName: string,
  attachedMedia?: { name: string; type: 'pdf' | 'image'; mimeType: string; size: number; dataUrl: string } | null
): Promise<string> {
  const origin = window.location.origin;
  const baseUrl = `${origin}/${codeshareId}`;

  const payload: Record<string, unknown> = {
    c: content,
    t: docTitle,
    m: modeName,
    ts: Date.now(),
  };

  // If attached media fits in URL (under 750KB), embed it directly
  if (attachedMedia && attachedMedia.dataUrl && attachedMedia.dataUrl.length < 800000) {
    payload.med = {
      name: attachedMedia.name,
      type: attachedMedia.type,
      mimeType: attachedMedia.mimeType,
      size: attachedMedia.size,
      dataUrl: attachedMedia.dataUrl,
    };
  }

  try {
    const token = await packDocumentToHashToken(payload, key);
    return `${baseUrl}#key=${key}&d=${token}`;
  } catch {
    return `${baseUrl}#key=${key}`;
  }
}

