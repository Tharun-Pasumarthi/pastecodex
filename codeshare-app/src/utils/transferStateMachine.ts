/**
 * PasteCodex Transfer Protocol & Robust State Machine
 * Implements Phase 3 requirements:
 * States: created -> uploading -> verifying -> available -> downloading -> completed
 * Terminal/recovery: paused, failed, cancelled, expired
 * Cryptographic verification: SHA-256 per chunk and whole file
 */

export type TransferState =
  | 'created'
  | 'uploading'
  | 'verifying'
  | 'available'
  | 'downloading'
  | 'completed'
  | 'paused'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface TransferChunkMeta {
  chunkIndex: number;
  totalChunks: number;
  byteLength: number;
  sha256Hex: string;
  isUploaded: boolean;
  uploadedAt?: number;
}

export interface FileTransferSession {
  transferId: string;
  roomId: string;
  filename: string;
  sanitizedFilename: string;
  mimeType: string;
  totalBytes: number;
  chunkSize: number;
  totalChunks: number;
  wholeFileSha256Hex: string;
  state: TransferState;
  chunks: TransferChunkMeta[];
  uploadedBytes: number;
  progressPercentage: number;
  createdAt: number;
  updatedAt: number;
  mode: 'temporary' | 'persistent';
  errorMessage?: string;
}

export type TransferStateListener = (session: FileTransferSession) => void;

/**
 * Computes SHA-256 hash of an ArrayBuffer or Uint8Array using Web Crypto API.
 * Returns hexadecimal digest string.
 */
export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitizes user-supplied filenames to prevent path traversal or injection.
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName) return 'unnamed_file';
  // Strip null bytes, slashes, backslashes, path traversal sequences
  const sanitized = rawName
    .replace(/\0/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\.+/g, '.')
    .trim();
  return sanitized.slice(0, 255) || 'unnamed_file';
}

/**
 * Validates transition legality according to the Phase 3 transfer specification.
 */
export function isValidTransition(from: TransferState, to: TransferState): boolean {
  const transitions: Record<TransferState, TransferState[]> = {
    created: ['uploading', 'cancelled', 'failed'],
    uploading: ['verifying', 'paused', 'cancelled', 'failed'],
    verifying: ['available', 'failed', 'cancelled'],
    available: ['downloading', 'expired', 'cancelled'],
    downloading: ['completed', 'failed', 'cancelled'],
    completed: ['downloading'], // Can be downloaded again
    paused: ['uploading', 'cancelled', 'failed'],
    failed: ['uploading', 'cancelled'], // Allow retry
    cancelled: [],
    expired: [],
  };

  return transitions[from]?.includes(to) ?? false;
}

/**
 * Transfer State Machine manager for in-flight and active file transfers.
 */
export class TransferManager {
  private sessions: Map<string, FileTransferSession> = new Map();
  private listeners: Map<string, Set<TransferStateListener>> = new Map();

  /**
   * Initializes a new file transfer session with chunk partitioning and whole-file hash.
   */
  public async createSession(
    roomId: string,
    fileBuffer: ArrayBuffer,
    rawFilename: string,
    mimeType: string,
    chunkSize: number = 450 * 1024,
    mode: 'temporary' | 'persistent' = 'persistent'
  ): Promise<FileTransferSession> {
    const transferId = 'xfer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    const sanitizedName = sanitizeFilename(rawFilename);
    const totalBytes = fileBuffer.byteLength;
    const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));
    const wholeFileSha256Hex = await computeSha256Hex(fileBuffer);

    const chunks: TransferChunkMeta[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalBytes);
      const slice = fileBuffer.slice(start, end);
      const chunkHash = await computeSha256Hex(slice);

      chunks.push({
        chunkIndex: i,
        totalChunks,
        byteLength: slice.byteLength,
        sha256Hex: chunkHash,
        isUploaded: false,
      });
    }

    const session: FileTransferSession = {
      transferId,
      roomId,
      filename: rawFilename,
      sanitizedFilename: sanitizedName,
      mimeType: mimeType || 'application/octet-stream',
      totalBytes,
      chunkSize,
      totalChunks,
      wholeFileSha256Hex,
      state: 'created',
      chunks,
      uploadedBytes: 0,
      progressPercentage: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode,
    };

    this.sessions.set(transferId, session);
    this.notify(session);
    return session;
  }

  /**
   * Transition session state safely.
   */
  public transitionState(transferId: string, newState: TransferState, errorMsg?: string): FileTransferSession {
    const session = this.sessions.get(transferId);
    if (!session) {
      throw new Error(`Transfer session ${transferId} not found`);
    }

    if (!isValidTransition(session.state, newState)) {
      throw new Error(`Illegal state transition from ${session.state} to ${newState}`);
    }

    session.state = newState;
    session.updatedAt = Date.now();
    if (errorMsg) {
      session.errorMessage = errorMsg;
    }

    this.notify(session);
    return session;
  }

  /**
   * Marks a specific chunk as verified and uploaded.
   */
  public markChunkComplete(transferId: string, chunkIndex: number): FileTransferSession {
    const session = this.sessions.get(transferId);
    if (!session) throw new Error(`Transfer session ${transferId} not found`);

    const chunk = session.chunks[chunkIndex];
    if (chunk && !chunk.isUploaded) {
      chunk.isUploaded = true;
      chunk.uploadedAt = Date.now();
      session.uploadedBytes += chunk.byteLength;
      session.progressPercentage = Math.round((session.uploadedBytes / session.totalBytes) * 100);
      session.updatedAt = Date.now();
      this.notify(session);
    }

    return session;
  }

  /**
   * Subscribes to transfer session lifecycle events.
   */
  public subscribe(transferId: string, listener: TransferStateListener): () => void {
    if (!this.listeners.has(transferId)) {
      this.listeners.set(transferId, new Set());
    }
    this.listeners.get(transferId)!.add(listener);

    const current = this.sessions.get(transferId);
    if (current) listener(current);

    return () => {
      this.listeners.get(transferId)?.delete(listener);
    };
  }

  private notify(session: FileTransferSession) {
    const set = this.listeners.get(session.transferId);
    if (set) {
      set.forEach((cb) => {
        try {
          cb({ ...session });
        } catch (e) {
          console.error('[TransferManager] Listener error:', e);
        }
      });
    }
  }

  public getSession(transferId: string): FileTransferSession | undefined {
    return this.sessions.get(transferId);
  }
}

// Global Singleton Transfer Manager instance
export const transferManager = new TransferManager();
