/**
 * PasteCodex Observability, Metrics, and Telemetry Engine (Phase 5)
 * Structured, privacy-preserving client and network performance measurements.
 * NEVER logs plain code, secrets, URLs with keys, or user data.
 */

export interface LatencySample {
  operation: 'crypto_encrypt' | 'crypto_decrypt' | 'doc_sync_rtt' | 'chat_delivery' | 'chunk_upload' | 'chunk_verify';
  durationMs: number;
  timestamp: number;
  success: boolean;
  byteLength?: number;
}

export interface SystemHealthStatus {
  isCryptoSupported: boolean;
  isIndexedDbSupported: boolean;
  isBroadcastChannelSupported: boolean;
  isOnline: boolean;
  lastSyncTimestamp: number;
  queuedSyncOperations: number;
  activeTransferCount: number;
}

class TelemetryEngine {
  private samples: LatencySample[] = [];
  private maxSamples: number = 200;
  private lastSyncTimestamp: number = Date.now();
  private queuedSyncCount: number = 0;
  private activeTransferCount: number = 0;

  /**
   * Record a performance latency sample.
   */
  public recordSample(
    operation: LatencySample['operation'],
    durationMs: number,
    success: boolean = true,
    byteLength?: number
  ): void {
    const sample: LatencySample = {
      operation,
      durationMs: Math.max(0, Math.round(durationMs * 10) / 10),
      timestamp: Date.now(),
      success,
      byteLength,
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift(); // Bound memory
    }
  }

  public markSyncCompleted(): void {
    this.lastSyncTimestamp = Date.now();
  }

  public setQueuedSyncCount(count: number): void {
    this.queuedSyncCount = Math.max(0, count);
  }

  public setActiveTransferCount(count: number): void {
    this.activeTransferCount = Math.max(0, count);
  }

  /**
   * Calculate percentile latencies for a given operation.
   */
  public getPercentiles(operation: LatencySample['operation']): { p50: number; p95: number; p99: number; count: number } {
    const filtered = this.samples
      .filter((s) => s.operation === operation && s.success)
      .map((s) => s.durationMs)
      .sort((a, b) => a - b);

    if (filtered.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const p50 = filtered[Math.floor(filtered.length * 0.5)] || 0;
    const p95 = filtered[Math.floor(filtered.length * 0.95)] || 0;
    const p99 = filtered[Math.floor(filtered.length * 0.99)] || 0;

    return { p50, p95, p99, count: filtered.length };
  }

  /**
   * Comprehensive health status check.
   */
  public getHealth(): SystemHealthStatus {
    const isCrypto = typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
    const isIndexedDb = typeof window !== 'undefined' && !!window.indexedDB;
    const isBC = typeof window !== 'undefined' && 'BroadcastChannel' in window;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return {
      isCryptoSupported: isCrypto,
      isIndexedDbSupported: isIndexedDb,
      isBroadcastChannelSupported: isBC,
      isOnline,
      lastSyncTimestamp: this.lastSyncTimestamp,
      queuedSyncOperations: this.queuedSyncCount,
      activeTransferCount: this.activeTransferCount,
    };
  }
}

export const telemetry = new TelemetryEngine();
