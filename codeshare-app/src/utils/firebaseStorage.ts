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
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';
import type { AttachedMedia } from '../types';
import { encryptPayload, decryptPayload } from './crypto';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY = 'codeshare_firebase_config';

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDVTzz1p2puuK4Xiayh1U4uAgdxp9164H0",
  authDomain: "codeshare-7aca3.firebaseapp.com",
  projectId: "codeshare-7aca3",
  storageBucket: "codeshare-7aca3.firebasestorage.app",
  messagingSenderId: "547250006609",
  appId: "1:547250006609:web:0362d1bc0778d30df16670",
};

/**
 * Load saved Firebase config from localStorage or Vite env, with built-in default
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }

  // Check Vite environment variables
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

/**
 * Save user-provided Firebase configuration
 */
export function saveFirebaseConfig(config: FirebaseConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Clear custom Firebase configuration
 */
export function clearFirebaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
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
}

/**
 * Upload an encrypted PDF or Image to Firebase (or fallback to local dev relay)
 */
export async function uploadEncryptedMediaToFirebase(
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
    // Upload ciphertext directly to Firestore / Firebase Storage
    try {
      if (file.size < 900 * 1024) {
        // Files under 900KB fit nicely in Firestore document directly
        await setDoc(doc(services.db, 'encrypted_blobs', codeshareId), payload);
      } else {
        // Larger files upload to Firebase Storage
        const storageRef = ref(services.storage, `encrypted_blobs/${codeshareId}.json`);
        await uploadString(storageRef, JSON.stringify(payload), 'raw', {
          contentType: 'application/json',
        });
      }
    } catch (err) {
      console.warn('[Firebase] Upload failed, falling back to local relay:', err);
      await fallbackUpload(codeshareId, payload);
    }
  } else {
    // If Firebase keys aren't set yet, use our built-in local relay
    await fallbackUpload(codeshareId, payload);
  }

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
 * Fetch encrypted blob from Firebase and decrypt locally in browser
 */
export async function fetchAndDecryptMediaFromFirebase(
  codeshareId: string,
  encryptionKey: string
): Promise<AttachedMedia | null> {
  try {
    let payload: EncryptedFirebasePayload | null = null;
    const services = getFirebaseServices();

    if (services) {
      try {
        const docSnap = await getDoc(doc(services.db, 'encrypted_blobs', codeshareId));
        if (docSnap.exists()) {
          payload = docSnap.data() as EncryptedFirebasePayload;
        } else {
          // Check Firebase Storage
          const storageRef = ref(services.storage, `encrypted_blobs/${codeshareId}.json`);
          const downloadUrl = await getDownloadURL(storageRef);
          const res = await fetch(downloadUrl);
          if (res.ok) {
            payload = await res.json();
          }
        }
      } catch (err) {
        console.warn('[Firebase] Remote fetch failed, trying local relay:', err);
      }
    }

    // Fallback to local dev relay if not found in Firebase
    if (!payload) {
      payload = await fallbackFetch(codeshareId);
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

    return {
      id: 'med_fb_' + codeshareId,
      name: payload.name,
      type: payload.type,
      mimeType: payload.mimeType,
      size: payload.size,
      dataUrl: decryptedDataUrl,
      isEncrypted: true,
      iv: payload.iv,
      uploadedAt: payload.uploadedAt,
    };
  } catch (err) {
    console.warn(`[Firebase] Could not fetch or decrypt media for ${codeshareId}:`, err);
    return null;
  }
}

/**
 * Delete media from Firebase
 */
export async function deleteMediaFromFirebase(codeshareId: string): Promise<boolean> {
  const services = getFirebaseServices();
  if (services) {
    try {
      await deleteDoc(doc(services.db, 'encrypted_blobs', codeshareId));
      const storageRef = ref(services.storage, `encrypted_blobs/${codeshareId}.json`);
      await deleteObject(storageRef).catch(() => {});
    } catch {
      // ignore
    }
  }

  // Also remove from local relay
  try {
    await fetch(`/api/blobs/${codeshareId}`, { method: 'DELETE' });
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
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}
