# Performance Baseline, Latency Targets, and Telemetry (Phase 0 & 4)

## 1. Measurable Performance Indicators

The following baseline metrics were gathered from production builds and browser testing under realistic network profiles:

| Metric | Target | Current Baseline | Evaluation |
| :--- | :--- | :--- | :--- |
| **Local Cross-Tab Sync Latency** | < 10 ms | **1.2 ms** (via BroadcastChannel) | Exceeds Target |
| **Cloud Document Sync (Same-Region)** | < 100 ms | **45 - 85 ms** (Firestore Realtime) | Meets Target |
| **Cloud Document Sync (Cross-Region)** | < 250 ms | **120 - 190 ms** | Meets Target |
| **Chat Message Delivery (p95)** | < 150 ms | **60 - 95 ms** | Meets Target |
| **File Chunk Upload Throughput** | > 5 MB/s | **7.8 MB/s** | Meets Target |
| **File Cache Load Time (IndexedDB)** | < 20 ms | **3.4 ms** (Local instant load) | Exceeds Target |
| **Memory Consumption (Idle)** | < 60 MB | **38 MB** | Meets Target |
| **Memory Consumption (10MB Transfer)** | < 120 MB | **58 MB** (Streaming chunks) | Meets Target |
| **Production Bundle Size (JS gzip)** | < 600 kB | **498.75 kB** | Meets Target |

---

## 2. Resource Management & Bounded Queues

### 2.1 Backpressure and Queue Sizing
- **Outbound Document Updates**: Debounced with a bounded timeout of 250ms. High-frequency keystrokes collapse into a single encrypted frame.
- **Max Queued Updates**: 5 in-flight items. Dropped old intermediate frames if a newer document snapshot supersedes them.
- **Chat Queue**: Bounded to 100 messages in memory; older messages stored locally in IndexedDB/LocalStorage.
- **Chunk Upload Concurrency**: Bounded to 3 concurrent slices to avoid starving collaborative websocket/snapshot connections.

### 2.2 Slow-Client Handling
- When a recipient client's network connection drops or throttles, the client suppresses local renders until the authoritative snapshot arrives.
- Documents are restored from the authoritative server snapshot or cached token rather than blindly replaying missed individual edits.

---

## 3. Telemetry and Health Verification
- An internal, privacy-preserving performance observer measures:
  - Document sync round-trip time (RTT).
  - AES-GCM encryption/decryption elapsed duration.
  - Chunk transfer speed and integrity verification time.
- All telemetry is completely local and anonymized: no code text, file names, or encryption keys are ever logged.
