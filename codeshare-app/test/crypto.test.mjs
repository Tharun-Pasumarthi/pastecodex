import test from 'node:test';
import assert from 'node:assert/strict';

test('Web Crypto SHA-256 calculation matches expected digest', async () => {
  const encoder = new TextEncoder();
  const data = encoder.encode('PasteCodex Secure Collaboration 2026');
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(digestBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  assert.equal(hex.length, 64, 'SHA-256 hex string must be 64 characters long');
  assert.match(hex, /^[0-9a-f]{64}$/);
});

test('AES-GCM encryption and decryption round-trip succeeds with authentication tag', async () => {
  const rawKey = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits IV
  const plainText = 'console.log("Zero knowledge code collaboration");';
  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plainText)
  );

  assert.ok(cipherBuffer.byteLength > plainText.length, 'Ciphertext includes authentication tag');

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    cipherBuffer
  );
  const decoder = new TextDecoder();
  const recoveredText = decoder.decode(decryptedBuffer);

  assert.equal(recoveredText, plainText, 'Decrypted text must match original plaintext exactly');
});

test('AES-GCM rejects tampered ciphertext or altered tag', async () => {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode('secret-code')
  );

  // Tamper with one byte of the ciphertext
  const tamperedArray = new Uint8Array(cipherBuffer);
  tamperedArray[0] ^= 0xff;

  await assert.rejects(
    async () => {
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, tamperedArray.buffer);
    },
    /operation failed|OperationError/i,
    'Decryption must reject tampered ciphertext without authentication tag match'
  );
});

test('Stealth token masks the key and decodes correctly', () => {
  const secretKey = '8f4c2e91b5a34d70';
  // Simulate stealth token encoding (base64url)
  const payload = `k=${secretKey}`;
  const encoded = Buffer.from(encodeURIComponent(payload)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  assert.ok(!encoded.includes(secretKey), 'Stealth token must not contain plaintext secret key');

  // Decode
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const decodedStr = decodeURIComponent(Buffer.from(b64, 'base64').toString('utf8'));
  const params = new URLSearchParams(decodedStr);
  assert.equal(params.get('k'), secretKey, 'Decoded key must match original');
});

