# Security Threat Model and Hardening Specification (Phase 2)

## 1. Threat Modeling Overview (STRIDE Analysis)

PasteCodex protects sensitive intellectual property, proprietary source code, and shared confidential files. All communication is secured against a passive or active eavesdropper, compromised intermediary nodes, and unauthorized participants.

| STRIDE Category | Threat Description | PasteCodex Countermeasure | Residual Risk & Status |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates room owner or collaborator | Cryptographically random room slugs (6+ chars base62) + AES-GCM encryption key required for message integrity | Low: Key distribution relies on secure channel (e.g. user sharing link) |
| **Tampering** | Cloud database or proxy alters document text or media bytes | AES-GCM 128-bit authentication tags on every cipher block + SHA-256 integrity hash verification | Mitigated: Any byte alteration causes decryption/integrity check failure |
| **Repudiation** | Client claims they did not send a chat or code change | Ephemeral sender IDs attached to cryptographically signed/authenticated frames | Acceptable for ephemeral collaboration model |
| **Information Disclosure** | Cloud infrastructure provider, ISP, or scraper reads plaintext code | Zero-Knowledge Client-Side Encryption: `#key=` is in URL hash fragment, never transmitted in HTTP request line or headers | Fully Mitigated: Server only sees high-entropy ciphertext |
| **Denial of Service** | Malicious actor sends massive payloads or floods connection | Bounded message payload size (256 KiB document, 64 KiB chat, 450 KiB chunk), rate limiting, bounded client queues | Enforced in client validation and Firestore security rules |
| **Elevation of Privilege**| View-only user attempts to overwrite active collaboration | Client-side view-only guard + server rules restricting updates when room is flagged locked | Protected: View-only links omit edit tokens |

---

## 2. Cryptographic Architecture

### 2.1 Encryption Standard
- **Cipher**: AES-GCM (Galois/Counter Mode) with 256-bit symmetric keys.
- **Initialization Vector (IV)**: 12-byte (96-bit) cryptographically secure pseudorandom numbers (`window.crypto.getRandomValues`) generated uniquely for every encryption operation.
- **Authentication Tag**: Standard 128-bit GCM authentication tag appended to the ciphertext.
- **Key Derivation / Handling**:
  - Keys are generated client-side via `crypto.getRandomValues(new Uint8Array(16 or 32))` and encoded in hexadecimal or URL-safe Base64.
  - Keys reside solely in memory and in the browser location hash (`window.location.hash`).
  - RFC 3986 guarantees that the fragment identifier (`#...`) is not sent over the wire in HTTP GET requests.

### 2.2 Integrity & Checksum Verification
- **Hash Algorithm**: SHA-256 (`crypto.subtle.digest('SHA-256', data)`).
- **Per-Chunk Hash**: Every uploaded chunk includes a SHA-256 digest verified by the recipient before reassembly.
- **Whole-File Digest**: Complete assembled blob is hashed and matched against the metadata digest before marking as available.

---

## 3. Input Validation & Content Security

### 3.1 Path Traversal & Filename Sanitization
- Filenames uploaded by users are strictly sanitized before storage or display:
  ```ts
  export function sanitizeFilename(raw: string): string {
    return raw
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '.')
      .trim()
      .slice(0, 255) || 'unnamed_file';
  }
  ```
- Blobs are addressed by server/client generated UUIDs (`media_<timestamp>_<random>`), never user-controlled filesystem paths.

### 3.2 Stored XSS Prevention
- CodeMirror renders code strictly inside sandboxed text content nodes.
- No user-supplied text or filename is ever injected via `dangerouslySetInnerHTML`.
- Image and PDF viewers enforce sanitized object URLs and strict MIME type gating (`image/*`, `application/pdf`, text previews).

### 3.3 Safe Memory Downloads
- Native `data:...` URLs were removed to prevent memory exhaustion and browser tab crashes on large files.
- `fileDownload.ts` generates scoped Blob URLs via `URL.createObjectURL(blob)` and schedules memory reclamation via `URL.revokeObjectURL` after a 60-second window.

---

## 4. Secret Management
- Zero private keys or service account credentials are embedded in client bundles.
- All Firebase API keys are restricted to client-side public identifiers (standard Firebase client SDK architecture).
- `.env.example` provides safe templates without credentials.
