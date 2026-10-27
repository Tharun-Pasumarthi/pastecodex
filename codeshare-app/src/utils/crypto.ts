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

