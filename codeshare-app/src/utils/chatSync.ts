/**
 * Real-Time Collaborator Chat & Messaging System
 *
 * Provides instant, zero-latency collaborator messaging with:
 * 1. Client-side AES-GCM (256-bit) zero-knowledge end-to-end encryption.
 * 2. Sub-millisecond instant cross-tab sync via BroadcastChannel.
 * 3. Immediate local storage persistence for 0ms render.
 * 4. Google Cloud Firestore real-time listener for multi-device sync.
 */

import { encryptPayload, decryptPayload } from './crypto';
import { getFirebaseServices } from './firebaseStorage';
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent';
}

export interface EncryptedChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  ciphertext: string;
  iv: string;
  timestamp: number;
}

const LOCAL_CHAT_PREFIX = 'codeshare_chat_';

// Persistent BroadcastChannels for chat
const chatBroadcastChannels = new Map<string, BroadcastChannel>();
function getChatBroadcastChannel(codeshareId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!chatBroadcastChannels.has(codeshareId)) {
    try {
      chatBroadcastChannels.set(codeshareId, new BroadcastChannel(`codeshare_chat_${codeshareId}`));
    } catch {
      return null;
    }
  }
  return chatBroadcastChannels.get(codeshareId) || null;
}

/**
 * Load cached chat messages from local storage (0ms instant access)
 */
export function getLocalChatMessages(codeshareId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_CHAT_PREFIX}${codeshareId}`);
    if (raw) {
      return JSON.parse(raw) as ChatMessage[];
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Save chat messages to local storage
 */
export function setLocalChatMessages(codeshareId: string, messages: ChatMessage[]): void {
  try {
    // Keep max 200 recent messages
    const trimmed = messages.slice(-200);
    localStorage.setItem(`${LOCAL_CHAT_PREFIX}${codeshareId}`, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/**
 * Send an end-to-end encrypted chat message with sub-millisecond local latency
 */
export async function sendChatMessage(
  codeshareId: string,
  message: ChatMessage,
  encryptionKey: string
): Promise<void> {
  // 1. Immediately cache locally
  const current = getLocalChatMessages(codeshareId);
  const updated = [...current.filter((m) => m.id !== message.id), { ...message, status: 'sent' as const }];
  setLocalChatMessages(codeshareId, updated);

  // 2. Broadcast immediately to other tabs in same browser (< 1ms)
  try {
    const channel = getChatBroadcastChannel(codeshareId);
    if (channel) {
      channel.postMessage({
        type: 'new_chat_message',
        message: { ...message, status: 'sent' as const },
      });
    }
  } catch {
    // ignore
  }

  // 3. Encrypt payload and persist to Firestore Cloud
  try {
    const { ciphertext, iv } = await encryptPayload(message.text, encryptionKey);
    const encMsg: EncryptedChatMessage = {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderColor: message.senderColor || '#3b82f6',
      ciphertext,
      iv,
      timestamp: message.timestamp,
    };

    const services = getFirebaseServices();
    if (services) {
      const chatDocRef = doc(services.db, 'codeshare_chats', codeshareId);
      const snap = await getDoc(chatDocRef);
      let existingEnc: EncryptedChatMessage[] = [];
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.messages)) {
          existingEnc = data.messages;
        }
      }
      const newMessages = [...existingEnc.filter((m) => m.id !== encMsg.id), encMsg].slice(-200);
      await setDoc(chatDocRef, {
        codeshareId,
        messages: newMessages,
        lastUpdated: Date.now(),
      });
    }
  } catch (err) {
    console.warn('[Chat] Failed to sync message to cloud:', err);
  }
}

/**
 * Subscribe to real-time chat updates (BroadcastChannel + Firestore listener)
 */
export function subscribeToChatMessages(
  codeshareId: string,
  mySenderId: string,
  encryptionKey: string,
  onNewMessages: (messages: ChatMessage[]) => void
): () => void {
  let isClosed = false;
  let firestoreUnsub: Unsubscribe | null = null;
  const decryptedCache = new Map<string, string>(); // messageId -> decrypted text

  // 1. Listen for local BroadcastChannel events (< 1ms latency)
  const channel = getChatBroadcastChannel(codeshareId);
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (isClosed || !event.data) return;
    if (event.data.type === 'new_chat_message' && event.data.message) {
      const incoming = event.data.message as ChatMessage;
      if (incoming.senderId !== mySenderId) {
        const current = getLocalChatMessages(codeshareId);
        if (!current.some((m) => m.id === incoming.id)) {
          const next = [...current, incoming];
          setLocalChatMessages(codeshareId, next);
          onNewMessages(next);
        }
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcastMessage);
  }

  // 2. Real-time Firestore onSnapshot for multi-device collaboration
  try {
    const services = getFirebaseServices();
    if (services) {
      firestoreUnsub = onSnapshot(
        doc(services.db, 'codeshare_chats', codeshareId),
        async (snap) => {
          if (isClosed || !snap.exists()) return;
          const data = snap.data();
          if (!data || !Array.isArray(data.messages)) return;

          const encList = data.messages as EncryptedChatMessage[];
          const decryptedList: ChatMessage[] = [];

          for (const enc of encList) {
            let plainText = decryptedCache.get(enc.id);
            if (!plainText) {
              try {
                plainText = await decryptPayload(enc.ciphertext, enc.iv, encryptionKey);
                decryptedCache.set(enc.id, plainText);
              } catch {
                plainText = '[Encrypted message]';
              }
            }
            decryptedList.push({
              id: enc.id,
              senderId: enc.senderId,
              senderName: enc.senderName,
              senderColor: enc.senderColor,
              text: plainText,
              timestamp: enc.timestamp,
              status: 'sent',
            });
          }

          if (!isClosed) {
            setLocalChatMessages(codeshareId, decryptedList);
            onNewMessages(decryptedList);
          }
        },
        (err) => {
          console.warn('[Chat Sync] Notice:', err.message);
        }
      );
    }
  } catch {
    // ignore
  }

  return () => {
    isClosed = true;
    if (channel) {
      channel.removeEventListener('message', handleBroadcastMessage);
    }
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }
  };
}
