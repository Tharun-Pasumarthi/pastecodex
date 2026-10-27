/**
 * Real-Time Document Synchronization Engine
 *
 * Provides bidirectional instant synchronization across multiple browser tabs,
 * incognito windows, and network devices using:
 * 1. BroadcastChannel API for sub-millisecond same-browser cross-tab sync.
 * 2. Window storage events as immediate fallback.
 * 3. Server-side /api/documents/:id relay for cross-browser, incognito, and LAN devices.
 * 4. Google Cloud Firestore real-time listeners for internet-wide live collaboration.
 */

import type { EditorSettings, ExpirationOption, AttachedMedia } from '../types';
import { getFirebaseServices } from './firebaseStorage';
import { doc, setDoc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

export interface DocumentSyncData {
  id: string;
  title: string;
  content: string;
  settings: EditorSettings;
  expiration: ExpirationOption;
  encryptionKey?: string;
  attachedMedia?: AttachedMedia | null;
  timestamp: number;
  senderId: string;
}

const LOCAL_STORAGE_PREFIX = 'codeshare_doc_';

/**
 * Save document state locally, to Firestore Cloud, and to the server relay, and broadcast to other tabs
 */
export async function saveDocument(docData: DocumentSyncData): Promise<void> {
  // 1. Local storage cache
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${docData.id}`, JSON.stringify(docData));
  } catch {
    // ignore
  }

  // 2. Broadcast to other open tabs in the same browser (sub-millisecond latency)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`codeshare_sync_${docData.id}`);
      channel.postMessage({
        type: 'sync_update',
        data: docData,
      });
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported or blocked
  }

  // 3. Persist to Google Cloud Firestore if connected
  try {
    const services = getFirebaseServices();
    if (services) {
      const cleanDoc: any = { ...docData };
      if (!cleanDoc.attachedMedia) {
        delete cleanDoc.attachedMedia;
      } else if (cleanDoc.attachedMedia.dataUrl && cleanDoc.attachedMedia.dataUrl.length > 700000) {
        // Exceeds Firestore 1MB document limit - store metadata safely
        cleanDoc.attachedMedia = {
          name: cleanDoc.attachedMedia.name,
          type: cleanDoc.attachedMedia.type,
          mimeType: cleanDoc.attachedMedia.mimeType,
          size: cleanDoc.attachedMedia.size,
          dataUrl: '',
        };
      }
      setDoc(doc(services.db, 'codeshare_documents', docData.id), cleanDoc).catch(() => {});
    }
  } catch {
    // Firestore error
  }

  // 4. Persist to server relay for other browsers / incognito windows
  try {
    await fetch(`/api/documents/${docData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData),
    });
  } catch {
    // Network or server offline
  }
}

/**
 * Fetch latest document state: checks Firestore Cloud first, then server relay, then local storage
 */
export async function fetchDocument(id: string): Promise<DocumentSyncData | null> {
  // 1. Try Firestore Cloud if connected
  try {
    const services = getFirebaseServices();
    if (services) {
      const snap = await getDoc(doc(services.db, 'codeshare_documents', id));
      if (snap.exists()) {
        const cloudDoc = snap.data() as DocumentSyncData;
        if (cloudDoc && typeof cloudDoc.content === 'string') {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(cloudDoc));
          } catch {
            // ignore
          }
          return cloudDoc;
        }
      }
    }
  } catch {
    // Firestore error
  }

  // 2. Try server relay to get latest remote updates (only if returning valid json)
  try {
    const res = await fetch(`/api/documents/${id}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const serverDoc = (await res.json()) as DocumentSyncData;
      if (serverDoc && typeof serverDoc.content === 'string') {
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(serverDoc));
        } catch {
          // ignore
        }
        return serverDoc;
      }
    }
  } catch {
    // server unreachable
  }

  // 3. Fallback to localStorage
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
    if (cached) {
      return JSON.parse(cached) as DocumentSyncData;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Subscribe to real-time updates for a given codeshare room
 */
export function subscribeToRoomSync(
  codeshareId: string,
  mySenderId: string,
  getCurrentDoc: () => DocumentSyncData | null,
  onRemoteUpdate: (data: DocumentSyncData) => void
): () => void {
  let isClosed = false;
  let broadcastChannel: BroadcastChannel | null = null;
  let lastReceivedTimestamp = 0;
  let firestoreUnsub: Unsubscribe | null = null;

  // 1. Setup BroadcastChannel for instant cross-tab sync
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(`codeshare_sync_${codeshareId}`);

      broadcastChannel.onmessage = (event) => {
        if (isClosed || !event.data) return;
        const { type, data, senderId } = event.data;

        if (type === 'sync_update' && data) {
          if (data.senderId !== mySenderId && data.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = data.timestamp;
            onRemoteUpdate(data);
          }
        } else if (type === 'request_latest' && senderId !== mySenderId) {
          const current = getCurrentDoc();
          if (current && broadcastChannel) {
            broadcastChannel.postMessage({
              type: 'sync_update',
              data: current,
            });
          }
        }
      };

      broadcastChannel.postMessage({
        type: 'request_latest',
        senderId: mySenderId,
      });
    }
  } catch {
    // BroadcastChannel unsupported
  }

  // 2. Storage event listener (fires in other tabs on localStorage changes)
  const handleStorageEvent = (event: StorageEvent) => {
    if (isClosed) return;
    if (event.key === `${LOCAL_STORAGE_PREFIX}${codeshareId}` && event.newValue) {
      try {
        const data = JSON.parse(event.newValue) as DocumentSyncData;
        if (data.senderId !== mySenderId && data.timestamp > lastReceivedTimestamp) {
          lastReceivedTimestamp = data.timestamp;
          onRemoteUpdate(data);
        }
      } catch {
        // ignore parse error
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. Firestore Cloud Real-Time Listener (for internet-wide sync)
  try {
    const services = getFirebaseServices();
    if (services) {
      firestoreUnsub = onSnapshot(
        doc(services.db, 'codeshare_documents', codeshareId),
        (snap) => {
          if (isClosed || !snap.exists()) return;
          const remoteDoc = snap.data() as DocumentSyncData;
          if (
            remoteDoc &&
            remoteDoc.senderId !== mySenderId &&
            remoteDoc.timestamp > lastReceivedTimestamp
          ) {
            lastReceivedTimestamp = remoteDoc.timestamp;
            onRemoteUpdate(remoteDoc);
          }
        },
        (err) => {
          console.warn('[Firestore Sync] Listener notice:', err.message);
        }
      );
    }
  } catch {
    // Firestore error
  }

  // 4. Periodic server polling (every 1.5s) to sync across local network / different browsers
  const intervalId = window.setInterval(async () => {
    if (isClosed) return;
    if (document.hidden) return;

    try {
      const res = await fetch(`/api/documents/${codeshareId}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverDoc = (await res.json()) as DocumentSyncData;
        if (
          serverDoc &&
          serverDoc.senderId !== mySenderId &&
          serverDoc.timestamp > lastReceivedTimestamp
        ) {
          lastReceivedTimestamp = serverDoc.timestamp;
          onRemoteUpdate(serverDoc);
        }
      }
    } catch {
      // ignore network errors
    }
  }, 1500);

  // Cleanup function
  return () => {
    isClosed = true;
    window.clearInterval(intervalId);
    window.removeEventListener('storage', handleStorageEvent);
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  };
}
