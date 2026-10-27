# Engineering Audit and Baseline (Phase 0)

## Executive Summary
This document provides an engineering audit of the **PasteCodex / CodeShare** platform. PasteCodex is a client-encrypted, real-time code collaboration and file transfer application. The system operates on a zero-knowledge architecture where documents, chat messages, and file attachments are encrypted client-side using 256-bit AES-GCM prior to transmission, with encryption keys maintained strictly within the browser URL hash fragment (`#key=...`).

---

## 1. Stack and Infrastructure Discovery

| Component | Technology | Configuration / Version |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.3.1 SPA | Vite 8.3.5 with `@vitejs/plugin-react` 6.1.2 |
| **Router Architecture** | Custom History Router | Path (`/:id`), Query (`?v=`), Hash (`#key=...&d=...`) via History API & PopState |
| **Language / Compiler** | TypeScript ~7.0.2 | Strict mode enabled, targeting ES2022 / ESNext |
| **Editor Engine** | CodeMirror 6 | `@uiw/react-codemirror` 4.25.12 with C++, CSS, HTML, JS, JSON, Python extensions |
| **Database & Realtime** | Google Cloud Firestore | Firebase SDK 13.1.0 (`codeshare_documents`, `encrypted_blobs`, `codeshare_chats`) |
| **Hosting & CDN** | Firebase Hosting | Site `codeshare-7aca3` (Deployed at `https://codeshare-7aca3.web.app`) |
| **Local / Edge Storage** | Browser IndexedDB | `PasteCodex_MediaStore` database with `media` object store (unlimited client cache) |
| **Cross-Tab Transport** | BroadcastChannel API | `codeshare_tab_sync` channel for 0ms sub-millisecond local tab synchronization |
| **Edge Compute Config** | Cloudflare Workers / Wrangler | `wrangler.toml` configured for Cloudflare Workers / Pages deployment |
| **Linting & Verification**| Oxlint 1.89.0 | Fast Rust-based linter with React Compiler & Hooks verification |

---

## 2. Authentication, Authorization, and Session Management
- **Identity Model**: Optional anonymous sessions with auto-generated persistent user ID (`usr_<random>`).
- **Authorization Enforcement**: 
  - Zero-Knowledge Security: Possession of the URL hash key (`#key=...`) is strictly required to decrypt document content, chat messages, and files.
  - View-Only Enforcement: A read-only flag (`?v=1` or `viewOnly: true`) locks the editor in the client and suppresses broadcast of modifications.
  - Firestore Security Rules: `firestore.rules` enforces size limits and document path scoping.

---

## 3. Real-Time Transport and Synchronization
- **Transport**: Firestore snapshot streams (`onSnapshot`) combined with the browser's native `BroadcastChannel` API.
- **Document Concurrency**:
  - Incremental timestamp ordering with monotonic sequencing (`timestamp: Date.now()`).
  - Active tab tracking via unique `senderId` (`tab_<id>`) preventing local echo-loop corruption.
  - In-flight debounce mechanism (250ms debounce) coalescing bursts of keystrokes while maintaining interactive responsiveness.
- **Chat Transport**:
  - Dedicated sub-collection or root collection `codeshare_chats`.
  - Multi-tiered decryption: Primary AES-GCM URL key -> Deterministic room key fallback (`getChatRoomKey`) -> Sanitized Base64 fallback, eliminating `[Encrypted message]` rendering anomalies.

---

## 4. File Transfer Architecture
- **Blob Handling**:
  - Files are read client-side into ArrayBuffers, encrypted with 256-bit AES-GCM, and partitioned into chunks (default 450 KiB) to comply with Firestore document bounds.
  - Client-side IndexedDB caching (`indexedDbStorage.ts`) allows instant, zero-latency retrieval without re-downloading previously received files across reloads.
- **Download Handling**:
  - Converted from insecure base64 data URLs to streaming/blob-based downloads via `fileDownload.ts` using `URL.createObjectURL(blob)` with controlled lifecycle cleanup (60-second delayed revocation).

---

## 5. Identified High-Priority Bugs & Issues

1. **Incorrect Timestamp Generation**:
   - **Bug**: `src/App.tsx` initialized `docTitle` state with a hardcoded static string `'Oct 27 10:45 AM'`.
   - **Bug**: Title generation logic used `toLocaleDateString('en-US', { hour: 'numeric', minute: '2-digit' })`. Under ECMA-402, `toLocaleDateString` only formats date components and either drops or unpredictably formats time in various browser engines.
   - **Resolution**: Introduce a centralized `formatFriendlyTimestamp(date?: Date)` utility leveraging `toLocaleString('en-US', { ... })` and dynamic initialization.

2. **React Rules-of-Hooks Violation**:
   - **Bug**: `src/components/SavedModal.tsx` contained an early return `if (!isOpen) return null;` before `useState` and `useEffect` calls.
   - **Resolution**: Move all hook declarations to the component top level and guard the JSX rendering conditionally.

3. **React Compiler Ref Warnings**:
   - **Bug**: `src/App.tsx` assigned `ref.current = value` directly during render body.
   - **Resolution**: Refactor ref synchronization into `useEffect` / layout effects or derive values safely.

4. **Missing Formal Transfer State Machine & Cryptographic Verification**:
   - **Issue**: File transfers lacked an explicit multi-state lifecycle (`created → uploading → verifying → available → downloading → completed`) and SHA-256 integrity validation per-chunk and whole-file.
   - **Resolution**: Implement `transferStateMachine.ts` with SHA-256 checksum generation via Web Crypto API.

5. **Missing Automated Testing Suite**:
   - **Issue**: No automated unit test runner was configured for cryptographic routines, state transitions, or sync logic.
   - **Resolution**: Configure automated test harness and implement comprehensive test coverage.

---

## 6. Baseline Verification Measurements
- **Build Time**: `tsc -b && vite build` completes in ~2.16s.
- **Production Bundle Sizes**:
  - HTML: 0.69 kB (gzip: 0.38 kB)
  - CSS: 14.64 kB (gzip: 3.72 kB)
  - JS: 1,541.18 kB (gzip: 498.75 kB) - contains bundled CodeMirror language parsers and Firebase SDK.
- **Linter Output**: Oxlint reported 2 errors in `SavedModal.tsx` and 18 render-ref warnings in `App.tsx`.
