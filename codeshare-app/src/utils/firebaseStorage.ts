/**
 * Firebase Zero-Knowledge Encrypted Storage Bridge
 *
 * Enables client-side encrypted sharing of PDFs, Images, and Code
 * directly using Firebase Storage & Firestore.
 *
 * The encryption key stays in the URL hash (#key=...) and is NEVER stored in Firebase.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { AttachedMedia } from '../types';
import { encryptPayload, decryptPayload } from './crypto';
import {
  cacheMediaInIndexedDB,
  getCachedMediaForRoom,
  getSingleCachedMedia,
  deleteMediaFromIndexedDB,
} from './indexedDbStorage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDVTzz1p2puuK4Xiayh1U4uAgdxp9164H0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "codeshare-7aca3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "codeshare-7aca3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "codeshare-7aca3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "547250006609",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:547250006609:web:0362d1bc0778d30df16670",
};

/**
 * Load Firebase config securely from Vite environment variables with fallback
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  // Clear any legacy custom config from localStorage to ensure clean credentials
  try {
    localStorage.removeItem('codeshare_firebase_config');
  } catch {
    // ignore
  }

  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseServices(): { db: Firestore; storage: FirebaseStorage } | null {
  const config = getFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (!firebaseAppInstance) {
      const existing = getApps();
      if (existing.length > 0) {
        firebaseAppInstance = existing[0];
      } else {
        firebaseAppInstance = initializeApp(config);
      }
      firestoreInstance = getFirestore(firebaseAppInstance);
      storageInstance = getStorage(firebaseAppInstance);
    }
    return { db: firestoreInstance!, storage: storageInstance! };
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
    return null;
  }
}

export interface EncryptedFirebasePayload {
  codeshareId: string;
  name: string;
  type: 'pdf' | 'image';
  mimeType: string;
  size: number;
  ciphertext: string;
  iv: string;
  uploadedAt: string;
  isEncrypted: boolean;
  chunkCount?: number;
}

/**
 * Upload an encrypted PDF or Image to Firebase (with chunking for large files)
 */
export async function uploadEncryptedMediaToFirebase(
  codeshareId: string,
  file: File,
  encryptionKey: string,
  customMediaId?: string
): Promise<AttachedMedia> {
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const mediaId = customMediaId || 'med_' + Math.random().toString(36).substr(2, 9);
  const blobDocId = `${codeshareId}_${mediaId}`;

  // 1. Read file as Base64 Data URL
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });

  // 2. Client-side AES-GCM (256-bit) zero-knowledge encryption
  const { ciphertext, iv } = await encryptPayload(rawDataUrl, encryptionKey);

  const payload: EncryptedFirebasePayload = {
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

  const services = getFirebaseServices();

  if (services) {
    try {
      const CHUNK_SIZE = 450000; // ~450KB chunks to safely respect Firestore 1MB limits
      if (ciphertext.length <= CHUNK_SIZE) {
        await Promise.all([
          setDoc(doc(services.db, 'encrypted_blobs', blobDocId), payload),
          setDoc(doc(services.db, 'encrypted_blobs', codeshareId), payload).catch(() => {}),
        ]);
      } else {
        const chunks: string[] = [];
        for (let i = 0; i < ciphertext.length; i += CHUNK_SIZE) {
          chunks.push(ciphertext.slice(i, i + CHUNK_SIZE));
        }
        const metaPayload: EncryptedFirebasePayload = {
          ...payload,
          ciphertext: '',
          chunkCount: chunks.length,
        };
        await Promise.all([
          setDoc(doc(services.db, 'encrypted_blobs', blobDocId), metaPayload),
          setDoc(doc(services.db, 'encrypted_blobs', codeshareId), metaPayload).catch(() => {}),
          ...chunks.map((chunk, idx) =>
            setDoc(doc(services.db, 'encrypted_blobs', `${blobDocId}_chk_${idx}`), {
              chunk,
              idx,
            })
          ),
        ]);
      }
    } catch (err) {
      console.warn('[Firebase] Upload failed, falling back to local relay:', err);
      await fallbackUpload(blobDocId, payload);
    }
  } else {
    await fallbackUpload(blobDocId, payload);
  }

  const resultMedia: AttachedMedia = {
    id: mediaId,
    name: file.name,
    type: isPdf ? 'pdf' : 'image',
    mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
    size: file.size,
    dataUrl: rawDataUrl,
    isEncrypted: true,
    iv,
    uploadedAt: payload.uploadedAt,
  };

  // Cache immediately in local IndexedDB for instant 0ms access
  cacheMediaInIndexedDB(codeshareId, resultMedia);

  return resultMedia;
}

/**
 * Fetch encrypted blob from Firebase (with reassembly) and decrypt locally in browser
 */
export async function fetchAndDecryptMediaFromFirebase(
  codeshareId: string,
  encryptionKey: string,
  mediaId?: string
): Promise<AttachedMedia | null> {
  // 1. Check local IndexedDB first for instant 0ms retrieval
  if (mediaId) {
    const cached = await getSingleCachedMedia(codeshareId, mediaId);
    if (cached && cached.dataUrl && cached.dataUrl.length > 50) {
      return cached;
    }
  }

  try {
    let payload: EncryptedFirebasePayload | null = null;
    const services = getFirebaseServices();
    const targetDocId = mediaId ? `${codeshareId}_${mediaId}` : codeshareId;

    if (services) {
      try {
        let docSnap = await getDoc(doc(services.db, 'encrypted_blobs', targetDocId));
        if (!docSnap.exists() && mediaId) {
          // Fallback to primary room doc
          docSnap = await getDoc(doc(services.db, 'encrypted_blobs', codeshareId));
        }
        if (docSnap.exists()) {
          payload = docSnap.data() as EncryptedFirebasePayload;
          const sourceId = docSnap.id;
          if (payload.chunkCount && payload.chunkCount > 0) {
            const chunkDocs = await Promise.all(
              Array.from({ length: payload.chunkCount }, (_, idx) =>
                getDoc(doc(services.db, 'encrypted_blobs', `${sourceId}_chk_${idx}`))
              )
            );
            const fullCiphertext = chunkDocs
              .map((snap) => (snap.exists() ? ((snap.data()?.chunk as string) || '') : ''))
              .join('');
            payload.ciphertext = fullCiphertext;
          }
        }
      } catch (err) {
        console.warn('[Firebase] Remote fetch failed, trying local relay:', err);
      }
    }

    // Fallback to local dev relay if not found in Firebase
    if (!payload) {
      payload = await fallbackFetch(targetDocId);
      if (!payload && mediaId) {
        payload = await fallbackFetch(codeshareId);
      }
    }

    if (!payload || !payload.ciphertext || !payload.iv) {
      return null;
    }

    // Client-side zero-knowledge decryption with AES-GCM
    const decryptedDataUrl = await decryptPayload(
      payload.ciphertext,
      payload.iv,
      encryptionKey
    );

    const decryptedMedia: AttachedMedia = {
      id: mediaId || ('med_fb_' + codeshareId),
      name: payload.name,
      type: payload.type,
      mimeType: payload.mimeType,
      size: payload.size,
      dataUrl: decryptedDataUrl,
      isEncrypted: true,
      iv: payload.iv,
      uploadedAt: payload.uploadedAt,
    };

    // Cache decrypted media in IndexedDB so subsequent visits load instantly
    cacheMediaInIndexedDB(codeshareId, decryptedMedia);

    return decryptedMedia;
  } catch (err) {
    console.warn(`[Firebase] Could not fetch or decrypt media for ${codeshareId}:`, err);
    return null;
  }
}

/**
 * Fetch and decrypt multiple media files in parallel using IndexedDB cache
 */
export async function fetchAndDecryptAllMediaFromFirebase(
  codeshareId: string,
  encryptionKey: string,
  mediaListMeta: AttachedMedia[]
): Promise<AttachedMedia[]> {
  if (!mediaListMeta || mediaListMeta.length === 0) return [];

  // Check IndexedDB cache for room
  const localCached = await getCachedMediaForRoom(codeshareId);
  const localMap = new Map<string, AttachedMedia>();
  localCached.forEach((m) => localMap.set(m.id, m));

  const results = await Promise.all(
    mediaListMeta.map(async (meta) => {
      // 1. If already in memory with dataUrl, keep it
      if (meta.dataUrl && meta.dataUrl.length > 50) return meta;

      // 2. If in IndexedDB cache, load instantly
      if (localMap.has(meta.id)) {
        return localMap.get(meta.id)!;
      }

      // 3. Otherwise fetch from cloud and decrypt
      const decrypted = await fetchAndDecryptMediaFromFirebase(codeshareId, encryptionKey, meta.id);
      return decrypted || meta;
    })
  );
  return results.filter(Boolean) as AttachedMedia[];
}

/**
 * Delete media from Firebase and IndexedDB
 */
export async function deleteMediaFromFirebase(
  codeshareId: string,
  mediaId?: string
): Promise<boolean> {
  // Delete from local IndexedDB
  deleteMediaFromIndexedDB(codeshareId, mediaId);

  const services = getFirebaseServices();
  const targetDocId = mediaId ? `${codeshareId}_${mediaId}` : codeshareId;

  if (services) {
    try {
      const docSnap = await getDoc(doc(services.db, 'encrypted_blobs', targetDocId));
      if (docSnap.exists()) {
        const data = docSnap.data() as EncryptedFirebasePayload;
        if (data.chunkCount && data.chunkCount > 0) {
          await Promise.all(
            Array.from({ length: data.chunkCount }, (_, idx) =>
              deleteDoc(doc(services.db, 'encrypted_blobs', `${targetDocId}_chk_${idx}`))
            )
          );
        }
      }
      await deleteDoc(doc(services.db, 'encrypted_blobs', targetDocId));
    } catch {
      // ignore
    }
  }

  // Also remove from local relay
  try {
    await fetch(`/api/blobs/${targetDocId}`, { method: 'DELETE' });
  } catch {
    // ignore
  }

  return true;
}

// Local relay fallbacks for zero-setup local dev
async function fallbackUpload(codeshareId: string, payload: EncryptedFirebasePayload) {
  await fetch(`/api/blobs/${codeshareId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function fallbackFetch(codeshareId: string): Promise<EncryptedFirebasePayload | null> {
  try {
    const res = await fetch(`/api/blobs/${codeshareId}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}
