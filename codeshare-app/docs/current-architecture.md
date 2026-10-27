# Current and Target System Architecture (Phase 0 & 1)

## 1. System Overview and Core Boundaries

PasteCodex separates interactive collaboration, large media transfer, and state synchronization across three distinct architectural planes:

```mermaid
graph TD
    subgraph Client Browser [Client Workspace]
        UI[React 19 Editor / UI Layer]
        CM[CodeMirror 6 Engine]
        Crypto[Web Crypto Subsystem AES-256-GCM / SHA-256]
        IDB[IndexedDB Cache PasteCodex_MediaStore]
        BC[BroadcastChannel codeshare_tab_sync]
        SM[Transfer State Machine Engine]
    end

    subgraph Transport & Coordination Layer
        FS_Sync[Firestore Snapshot Realtime Sync]
        FS_Chat[Firestore Chat Stream]
        FS_Blob[Firestore Encrypted Blob Storage]
        CF_Edge[Cloudflare Worker / Edge Gateway]
    end

    subgraph Security Perimeter
        HashKey["URL Fragment (#key=...) Zero-Knowledge Key"]
        ServerBoundary[Untrusted Cloud Infrastructure]
    end

    UI --> CM
    UI --> Crypto
    Crypto --> IDB
    UI --> SM
    SM --> FS_Blob
    UI --> BC
    UI --> FS_Sync
    UI --> FS_Chat

    HashKey -. Never sent to server .-> ClientBrowser
    FS_Sync --> ServerBoundary
    FS_Blob --> ServerBoundary
```

---

## 2. Traffic Class Separation

### A. Collaborative Code Traffic
- **Protocol**: Real-time snapshot diffs with monotonic timestamps (`timestamp`) and sender IDs (`senderId`).
- **Conflict Strategy**: Last-Write-Wins with active-tab suppression (suppressing self-emitted echo packets) and in-flight debounce (250ms).
- **Transport**: Firestore real-time snapshot listeners for wide-area sync; native `BroadcastChannel` (`codeshare_tab_sync`) for 0ms same-origin cross-tab sync.
- **Message Bound**: Document updates are strictly text-based and limited to 256 KiB. Bulk binary payloads are barred from this channel.

### B. File Transfer Traffic
- **Protocol**: Chunked transfer state machine with per-chunk and whole-file SHA-256 checksums.
- **Transfer States**:
  `created` ➔ `uploading` ➔ `verifying` ➔ `available` ➔ `downloading` ➔ `completed`
  (Terminal & recovery states: `paused`, `failed`, `cancelled`, `expired`).
- **Chunking Model**: 450 KiB slice boundaries. Each slice is encrypted with AES-GCM (using unique IV) before leaving the client browser.
- **Deduplication and Local Caching**: Received files are verified against expected SHA-256 digests and immediately written to browser IndexedDB, eliminating repetitive network transfers on page reloads.

### C. Control-Plane Traffic
- **URL Structure**:
  - `/:id` — Unique alphanumeric room slug (cryptographically random, 6–8 characters).
  - `?v=1` — Optional view-only enforcement flag.
  - `#key=<hex>&d=<base64>` — Zero-knowledge client-only URL fragment:
    - `key`: 256-bit AES-GCM symmetric decryption key.
    - `d`: Optional compact initial state token enabling zero-server offline instant booting.

---

## 3. Data Flow Diagram: Zero-Knowledge Collaboration

```mermaid
sequenceDiagram
    autonumber
    participant Alice as Alice (Client A)
    participant Channel as Realtime Coordination (Firestore / BC)
    participant Bob as Bob (Client B)

    Alice->>Alice: User types code or modifies editor
    Alice->>Alice: Encrypt plaintext with AES-GCM using #key
    Alice->>Alice: Generate timestamp & attach senderId
    Alice->>Channel: Transmit encrypted payload { c, t, m, timestamp, senderId }
    Channel-->>Bob: Broadcast snapshot update
    Bob->>Bob: Verify senderId != mySenderId and timestamp > lastReceived
    Bob->>Bob: Decrypt payload using local #key
    Bob->>Bob: Update CodeMirror editor without losing local cursor position
```

---

## 4. Storage Abstraction and Lifecycle

```mermaid
stateDiagram-v2
    [*] --> created: User selects file
    created --> uploading: Begin slice transmission
    uploading --> verifying: All chunks uploaded
    verifying --> available: SHA-256 digest validated
    available --> downloading: Recipient initiates fetch
    downloading --> completed: File saved to IndexedDB / disk
    uploading --> paused: Network drop / manual pause
    paused --> uploading: Resume transfer
    uploading --> failed: Corrupted chunk hash
    uploading --> cancelled: User aborted
```
