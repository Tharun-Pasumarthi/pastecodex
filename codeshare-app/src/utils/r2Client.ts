/**
 * Cloudflare R2 Client & Zero-Knowledge Encryption Bridge
 *
 * Architecture:
 * 1. User selects a PDF or image.
 * 2. Client browser generates a 256-bit AES-GCM key K and random 96-bit IV.
 * 3. Client browser encrypts the file data into ciphertext using Web Crypto API.
 * 4. Client uploads ONLY the ciphertext blob + non-sensitive metadata (name, mimeType, size)
 *    to Cloudflare R2 at `/api/blobs/:codeshareId`.
 * 5. Secret Key K is appended ONLY to the URL fragment (#key=K) and NEVER sent to Cloudflare or R2.
 * 6. Recipient fetches ciphertext from Cloudflare R2 and decrypts locally using K.
 */

import type { AttachedMedia } from '../types';
import { encryptPayload, decryptPayload } from './crypto';

export interface R2BlobPayload {
  codeshareId: string;
  name: string;
  type: 'pdf' | 'image';
  mimeType: string;
  size: number;
  ciphertext: string;
  iv: string;
  uploadedAt: string;
  isEncrypted: boolean;
}

/**
 * Upload an encrypted PDF or Image to Cloudflare R2 storage
 */
export async function uploadEncryptedMediaToR2(
  codeshareId: string,
  file: File,
  encryptionKey: string
): Promise<AttachedMedia> {
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

  // 1. Read file as Base64 Data URL
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });

  // 2. Client-side AES-GCM (256-bit) encryption
  const { ciphertext, iv } = await encryptPayload(rawDataUrl, encryptionKey);

  const payload: R2BlobPayload = {
    codeshareId,
    name: file.name,
    type: isPdf ? 'pdf' : 'image',
    mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
    size: file.size,
    ciphertext,
    iv,
    uploadedAt: new Date().toISOString(),
    isEncrypted: true,
  };

  // 3. Upload encrypted ciphertext to Cloudflare R2 API
  const response = await fetch(`/api/blobs/${codeshareId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Failed to upload to Cloudflare R2: ${response.statusText} ${errText}`);
  }

  // Return attached media ready for local viewer
  return {
    id: 'med_' + Math.random().toString(36).substr(2, 9),
    name: file.name,
    type: isPdf ? 'pdf' : 'image',
    mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
    size: file.size,
    dataUrl: rawDataUrl,
    isEncrypted: true,
    iv,
    uploadedAt: payload.uploadedAt,
  };
}

/**
 * Fetch encrypted blob from Cloudflare R2 and decrypt locally in browser
 */
export async function fetchAndDecryptMediaFromR2(
  codeshareId: string,
  encryptionKey: string
): Promise<AttachedMedia | null> {
  try {
    const response = await fetch(`/api/blobs/${codeshareId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Cloudflare R2 fetch error: ${response.statusText}`);
    }

    const blobData = (await response.json()) as R2BlobPayload;
    if (!blobData || !blobData.ciphertext || !blobData.iv) {
      return null;
    }

    // Client-side zero-knowledge decryption
    const decryptedDataUrl = await decryptPayload(
      blobData.ciphertext,
      blobData.iv,
      encryptionKey
    );

    return {
      id: 'med_r2_' + codeshareId,
      name: blobData.name,
      type: blobData.type,
      mimeType: blobData.mimeType,
      size: blobData.size,
      dataUrl: decryptedDataUrl,
      isEncrypted: true,
      iv: blobData.iv,
      uploadedAt: blobData.uploadedAt,
    };
  } catch (err) {
    console.warn(`[Cloudflare R2] Could not fetch or decrypt media for ${codeshareId}:`, err);
    return null;
  }
}

/**
 * Delete blob from Cloudflare R2
 */
export async function deleteMediaFromR2(codeshareId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/blobs/${codeshareId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}
