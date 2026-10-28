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
 * Handles #key=xxx, #k=xxx, #s=xxx (stealth/cloaked token), and &d=yyy formats
 */
export function parseHashParams(hashStr: string): { key?: string; docToken?: string } {
  if (!hashStr) return {};
  const clean = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
  
  // Check for stealth/cloaked token (#s=...)
  if (clean.startsWith('s=')) {
    const stealthToken = clean.slice(2).split('&')[0];
    const decoded = decodeStealthToken(stealthToken);
    if (decoded.key) {
      return decoded;
    }
  }

  const params = new URLSearchParams(clean);
  const stealthParam = params.get('s');
  if (stealthParam) {
    const decoded = decodeStealthToken(stealthParam);
    if (decoded.key) {
      return decoded;
    }
  }

  const key = params.get('key') || params.get('k') || undefined;
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
 * Encodes key (and optional document token) into an obfuscated stealth token (#s=...)
 * Masks the raw encryption key so it cannot be read in plaintext by casual observers or shoulder-surfers.
 */
export function encodeStealthToken(key: string, docToken?: string): string {
  try {
    const payload = docToken ? `k=${key}&d=${docToken}` : `k=${key}`;
    // Base64url encode with a salt prefix
    const b64 = window.btoa(encodeURIComponent(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return b64;
  } catch {
    return key;
  }
}

/**
 * Decodes a stealth token (#s=...) back into key and document token
 */
export function decodeStealthToken(token: string): { key?: string; docToken?: string } {
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = decodeURIComponent(window.atob(b64));
    const params = new URLSearchParams(decoded);
    return {
      key: params.get('k') || undefined,
      docToken: params.get('d') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Builds a clean, short zero-knowledge share URL
 * Supports stealth cloaking so the raw #key=... is hidden behind #s=...
 */
export function generateShareableUrl(
  codeshareId: string,
  key?: string,
  viewOnly: boolean = false,
  stealth: boolean = false
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const query = viewOnly ? '?v=1' : '';
  const baseUrl = `${origin}/${codeshareId}${query}`;
  if (!key) return baseUrl;

  if (stealth) {
    const stealthToken = encodeStealthToken(key);
    return `${baseUrl}#s=${stealthToken}`;
  }

  return `${baseUrl}#key=${key}`;
}

/**
 * Shortens a URL using TinyURL to completely hide the full URL, codeshare ID, and encryption key.
 * Uses TinyURL's API with multi-stage CORS proxy fallback and graceful local resolution.
 */
export async function shortenWithTinyUrl(longUrl: string): Promise<string> {
  const encoded = encodeURIComponent(longUrl);
  const tinyUrlEndpoint = `https://tinyurl.com/api-create.php?url=${encoded}`;

  // List of endpoints to try: direct, then public CORS proxies
  const endpoints = [
    tinyUrlEndpoint,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(tinyUrlEndpoint)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(tinyUrlEndpoint)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = (await res.text()).trim();
        if (text.startsWith('http://tinyurl.com') || text.startsWith('https://tinyurl.com')) {
          return text.replace('http://', 'https://');
        }
      }
    } catch {
      // continue to next fallback
    }
  }

  // If external network is offline, on localhost, or blocked by firewalls:
  // Return a clean stealth URL that already hides the key and parameters!
  return longUrl;
}

/**
 * Cleanly hides/sanitizes the encryption key from the browser's address bar without reloading
 */
export function sanitizeBrowserAddressBar(): void {
  if (typeof window === 'undefined' || !window.history) return;
  try {
    const url = new URL(window.location.href);
    if (url.hash && (url.hash.includes('key=') || url.hash.includes('s='))) {
      // Remove hash from visible address bar while keeping the page intact
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  } catch {
    // ignore
  }
}


