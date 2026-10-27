/**
 * High-performance browser IndexedDB storage for encrypted & decrypted media files.
 * Provides instant 0ms retrieval, survives page reloads, and avoids localStorage size limits.
 */

import type { AttachedMedia } from '../types';

const DB_NAME = 'PasteCodex_MediaStore';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache an attached media item in IndexedDB
 */
export async function cacheMediaInIndexedDB(codeshareId: string, media: AttachedMedia): Promise<void> {
  if (!media.dataUrl) return;
  try {
    const db = await openDB();
    const key = `${codeshareId}_${media.id}`;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key,
      codeshareId,
      mediaId: media.id,
      media,
      cachedAt: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('[IndexedDB] Cache media error:', err);
  }
}

/**
 * Batch cache multiple media items in IndexedDB
 */
export async function cacheAllMediaInIndexedDB(codeshareId: string, mediaList: AttachedMedia[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const media of mediaList) {
      if (media.dataUrl) {
        const key = `${codeshareId}_${media.id}`;
        store.put({
          key,
          codeshareId,
          mediaId: media.id,
          media,
          cachedAt: Date.now(),
        });
      }
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('[IndexedDB] Batch cache media error:', err);
  }
}

/**
 * Get all cached media for a codeshare room from IndexedDB (0ms instant load)
 */
export async function getCachedMediaForRoom(codeshareId: string): Promise<AttachedMedia[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const records = await new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = reject;
    });
    return records
      .filter((r) => r.codeshareId === codeshareId && r.media?.dataUrl)
      .map((r) => r.media as AttachedMedia);
  } catch (err) {
    console.warn('[IndexedDB] Get cached media error:', err);
    return [];
  }
}

/**
 * Get a specific cached media item from IndexedDB
 */
export async function getSingleCachedMedia(codeshareId: string, mediaId: string): Promise<AttachedMedia | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = `${codeshareId}_${mediaId}`;
    const request = store.get(key);
    const record = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
    return record?.media || null;
  } catch {
    return null;
  }
}

/**
 * Delete a media item from IndexedDB
 */
export async function deleteMediaFromIndexedDB(codeshareId: string, mediaId?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (mediaId) {
      store.delete(`${codeshareId}_${mediaId}`);
    } else {
      // Delete all media for this room
      const request = store.getAll();
      const records = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = reject;
      });
      for (const r of records) {
        if (r.codeshareId === codeshareId) {
          store.delete(r.key);
        }
      }
    }
  } catch {
    // ignore
  }
}
