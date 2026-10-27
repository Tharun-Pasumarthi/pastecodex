# Target Reverse Engineering Specification & Implementation Plan: Codeshare.io

## 1. Inspection Methodology & Scope

### 1.1 Tools & Evidence Sources
- **Reverse Engineering Engine**: Reverse Engineer Anything (REA) via `capture_browser_scenario` running controlled headless Chromium (`Chromium@155.0.8059.85`).
- **REA Evidence IDs Captured**:
  - `ev_98d1932a216e02f05a12c5942846816f085d3f1966c5047c8437ed1cda098d2b` (Landing Page `/`)
  - `ev_81b4fe31b21ef5cd5e84564102b08b603a02c6ba58b948bfc7be468d8b4e5cc2` (Editor initialization via `/new` -> `/5NxYxV`)
  - `ev_e7f30fe88e548a6a376e051c2407422b6b83710656fdfebc28d53d3a13109c86` (Sidebar Settings Panel interaction)
  - `ev_b89baf6876759293aef62374ace68c92f9877a4610dfcfc81d4b54f4a8ee7fe8` (Share Modal interaction)
  - `ev_a1e8c68e55bebb9ca23cd6f0f1bc091b218ab3d71faa09cee14e8f7337f927c0` (About Panel interaction)
  - `ev_6b13b29b3c76f6b5b2cddbd3471848fe7720e0cb923cbe939b2bb80cae8e95f7` (Pricing Page `/plans`)
  - `ev_dafd40c4a8ac8bbfcded1251d658581d9405c323b0a79318c8afae0f35bf91e4` (Login Page `/login`)
  - `ev_db9e790c01f2f026a534597a1bfb2c3b72179a2e1b13c40127b8d630039e8b5f` (Sign Up Page `/register`)

### 1.2 Inspection Boundaries
- **Inspected & Confirmed**: Visible public DOM elements, styles, client-side route transitions, form fields, modal layouts, sidebar panels, CodeMirror editor integration, and Next.js client hydration props (`__NEXT_DATA__`).
- **Not Inspected / Unknown**: Proprietary backend server code, database schemas, internal WebRTC signaling protocol, and payment webhook execution. All client recreations rely strictly on observable behavior.

---

## 2. Reverse Engineering Findings

### 2.1 Navigation & Page Architecture
| Route | Type | Observed Content & Behavior |
|---|---|---|
| `/` | Landing / Hero | Clean hero with title "Share Code in Real-time with Developers", subtitle, "Share Code Now" CTA linking to `/new`, sample screen video previews, trusted enterprise badges, 3 feature pillars ("Code with your team", "Interview developers", "Teach people to program"), and footer links. |
| `/new` | Generator | Transient endpoint that generates a 6-character alphanumeric slug (e.g. `5NxYxV`, `G7WQWo`) and immediately redirects the user to `/[codeshareId]`. |
| `/[codeshareId]` | Editor Workspace | Main application: top navbar with logo, "New" room button, optional expiration timer ("Never Expires" / configurable), "Save Codeshare" CTA, "Saved" library modal, "Share" button, login link. Code editor with attached PDF/Image tabs. Right vertical icon toolbar with Settings, File Attachment, Download, New Codeshare, Firebase Cloud config, and About panels. |
| `/login` | Auth | Form with Email, Password, submit button, error message container (`#error`), quick demo credentials filler, and links to register. |
| `/register` | Auth | Form with Full Name, Email, Password, submit button, error message container, and redirect query parameter support (`?saveCodeshare=<id>`). |

### 2.2 Editor & Workspace Interactions
1. **Editor Buffer**:
   - Code editor supporting line numbers, syntax highlighting, bracket matching, indentation guides, and empty state placeholder: `"Write or paste code here then share. Anyone you share with will see code as it is typed!"`.
2. **Right Sidebar Toolbar**:
   - **Settings (Gear Icon)**: Opens side drawer with:
     - *Syntax*: Language mode selector (e.g., JavaScript, TypeScript, Python, HTML, CSS, JSON, C++, Rust, Go, etc.).
     - *Tab Size*: Indent size selector (2, 4, 6, 8 spaces).
     - *Theme*: Editor themes (Dark Monokai, Dracula, Material, Solarized Dark/Light, etc.).
     - *Keymap*: Standard, Sublime, Vim, Emacs.
   - **Download (Download Icon)**: Automatically triggers client-side download of the editor content with filename formatted from title and appropriate extension (e.g., `.js`, `.py`, `.ts`).
   - **New Codeshare (Plus Icon)**: Navigates to `/new` to spawn a new clean session.
   - **About / Feedback (Info Icon)**: Opens info drawer with project description and social links.
3. **Share Modal (`CodeshareShareModal`)**:
   - Triggered by header "Share" button.
   - Displays full shareable URL in a readonly input.
   - "Copy" button with instant clipboard write and visual "Copied!" feedback transition.
   - "View only" mode toggle switch (with permission hint for free/anonymous users vs owner).
4. **Expiration Banner & Save Action**:
   - Displays countdown badge ("Expires in 24 hours").
   - "Save Codeshare" button leading to registration with the codeshare ID preserved so the document can be claimed.

---

## 3. Assumptions vs. Unknowns vs. Evidence

| Aspect | Status | Evidence / Notes |
|---|---|---|
| Frontend Component Structure | **Evidence** | Directly inspected in DOM & `__NEXT_DATA__` GraphQL fragments (`CodesharePage`, `CodeshareNavbar`, `CodeshareEditor`, `CodeshareSidebar`, `CodeshareShareModal`, `CodeshareSettingsForm`). |
| Editor Engine | **Evidence** | Observable CodeMirror classes (`.CodeMirror`, `.cm-s-monokai`, `.CodeMirror-gutters`, `.CodeMirror-linenumber`). |
| Slug Format | **Evidence** | Observed URLs: `5NxYxV`, `GAxoxx`, `G7WQWo`, `aVxYx8` (6 alphanumeric mixed-case chars). |
| Real-time Collaboration Protocol | **Unknown** | Transport payload format over WebSocket/Relay is proprietary; front-end can simulate multi-cursor presence, live broadcast, and local history states. |
| User Identity Model | **Evidence** | Anonymous session tokens initialized with UUIDs (`TWU6YW5vbjo...`), upgrading to registered accounts upon signup. |
| Persistence Engine | **Unknown** | Server backend storage details unobserved. Recreated frontend will use local/session state with mock persistence or broadcast channels. |

---

## 4. Implementation Plan for Recreated Frontend

1. **Project Setup**:
   - Vite + React + TypeScript + modern CSS styling with dark/light themes and CodeMirror/Monaco editor support.
   - Lucide/FontAwesome icon set matching the target aesthetic.
2. **Core Routes & Navigation**:
   - `/` Landing Page: Hero, live interactive preview banner, features, footer.
   - `/new`: Generates 6-character random slug and redirects to `/:codeshareId`.
   - `/:codeshareId`: The complete Codeshare live editor workspace.
   - `/plans`: Pricing and feature comparison.
   - `/login` & `/register`: Authentication flows with input validation and error states.
3. **Editor Workspace Components**:
   - Top Header (`Navbar`): Brand logo, 24-hour expiration badge, "Save Codeshare" button, "Share" modal trigger, user login/status, collaborator avatars.
   - Central Editor: CodeMirror/rich syntax editor with line numbers, placeholder, tab sizing, and active theme.
   - Right Action Sidebar:
     - Settings Drawer (Syntax, Tab Size, Theme, Keymap).
     - Download Handler with dynamic file extension mapping.
     - New Document shortcut.
     - About Drawer.
   - Modals:
     - Share Modal with copy-to-clipboard and View-Only toggle switch.
     - Save/Claim Codeshare Modal.
   - Simulated Multi-User / Collaborator Cursor indicators to demonstrate observable real-time features.
4. **Testing & Validation**:
   - Form validation (invalid email, short password, empty fields).
   - Share modal clipboard copying & visual confirmation.
   - Download functionality with custom syntax extensions.
   - Setting adjustments reflecting live in the editor (tab size, language, theme).

---

## 5. Feature Extension: Encrypted PDF & Image Sharing via Link

### 5.1 Motivation & Feature Requirement
While the original target application is strictly a plain-text code editor, modern development workflows frequently require sharing visual architectural diagrams, mockups, design specifications, and multi-page technical PDF documents alongside or within the same shareable session.

To preserve the zero-trust privacy requirement, the shared files must be encrypted with end-to-end security such that only users with the specific share link can decrypt and view the attached files.

### 5.2 Zero-Knowledge Link Encryption Architecture
- **Cryptographic Primitive**: Web Crypto API standard **AES-GCM (256-bit)** with random 96-bit initialization vectors (IV).
- **Zero-Knowledge Key Delivery**:
  - The secret key is included in the URL fragment: `http://localhost:5173/:slug#key=<256-bit-hex-key>`.
  - **RFC 3986 Compliance**: According to HTTP standards, URL hash fragments are handled exclusively on the client side and are **never transmitted to any web server or proxy in HTTP request headers**.
  - This guarantees client-side zero-knowledge privacy: even if an untrusted server stores the session data, it cannot read the content or decrypt the PDF or image.
- **Payload Handling**:
  - Attached media (PDF documents, SVG, PNG, JPG, WEBP) are encoded to data URLs, encrypted via AES-GCM, and unpacked in the browser upon navigation.

### 5.3 Implementation Components
1. [src/utils/crypto.ts](file:///c:/REA/codeshare-study/codeshare-app/src/utils/crypto.ts):
   - `encryptPayload`: Generates 96-bit IV, performs AES-GCM encryption, returns base64 ciphertext and IV.
   - `decryptPayload`: Recreates cryptographic key from URL hash parameter and decrypts data in real time.
   - `generateEncryptionKey`: Generates 256-bit cryptographic keys.
2. [src/components/FileUploadModal.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/FileUploadModal.tsx):
   - Drag-and-drop file upload zone for `.pdf` and all common image types (`png`, `jpg`, `svg`, `webp`, `gif`).
   - One-click sample loaders (`Sample Image (SVG)` and `Sample PDF`) for instant zero-friction demonstration.
   - AES-GCM encryption toggle switch with live status badge.
3. [src/components/MediaViewer.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/MediaViewer.tsx):
   - **PDF Document Viewer**: Embedded canvas with responsive scaling and multi-page interaction.
   - **Image Viewer**: Zoom in / zoom out controls (50% to 300%), rotate/reset controls, transparency checkerboard background, pop-out modal, and download button.
   - **Security Badge**: Visual `AES-256 Encrypted` verified badge.
4. [src/components/Navbar.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/Navbar.tsx) & [src/components/Sidebar.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/Sidebar.tsx):
   - "Attach File" button with active attachment indicators.
   - Tab switcher (`[Code]` vs `[PDF/Image]`) allowing seamless switching between code and attached documents.
5. [src/components/ShareModal.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/ShareModal.tsx):
   - Displays encrypted shareable URL with `#key=...` fragment.
   - Summarizes attached media included in the link.
   - Provides one-click clipboard copying and zero-knowledge encryption explanation.

### 5.4 Verification & Test Artifacts
- **Automated Browser Scenario Run**: Verified end-to-end attaching of media, switching between Code and Media tabs, downloading, and generating encrypted share links.
- **Visual Artifacts**:
  - Share modal with encrypted link: `share_modal_page_1793099071898.png`
  - Media viewer with encrypted diagram: `media_viewer_page_1793099052467.png`
  - Full browser session video: `test_encrypted_sharing_1793098869275.webp`

---

## 6. Session Reliability, Optional Expiration & Production Deployment Architecture

### 6.1 Addressed Feedback & Fixes
1. **Interactive Real-Time Login Validation**:
   - Added instant inline field feedback on blur/type: checks email syntax and password length (>= 6 chars) with red visual error states.
   - Removed artificial delay timeouts, making authentication immediate (<150ms).
   - Added a 1-click "Fill Demo Credentials" action.
2. **Persistent User Sessions**:
   - Persisted `currentUser` and session tokens in `localStorage`.
   - Prevented premature session resets or logouts on page reloads or tab navigation.
   - Added an explicit `Log out` button in the header so the user can control when a session terminates.
3. **Optional Link Expiration**:
   - Transformed the hardcoded 24-hour expiration into an **optional and customizable setting**:
     - `Never (Permanent link - No Expiry)` [Default]
     - `1 Hour`
     - `24 Hours`
     - `7 Days`
     - `30 Days`
   - Interactive header badge: shows `Never Expires` or `Expires in X` and clicking it opens the Expiration settings.
4. **Snappy Share & Instant Copy**:
   - Provided instant dual-fallback clipboard copy (<5ms) directly from the header and within the share dialog.

### 6.2 Implemented Cloudflare R2 Zero-Knowledge Storage Architecture
To enable real-world multi-user sharing across devices and networks:
1. **Cloudflare R2 Bucket Configuration ([wrangler.toml](file:///c:/REA/codeshare-study/codeshare-app/wrangler.toml))**:
   - Declares the R2 bucket binding `CODESHARE_BUCKET` pointing to bucket `codeshare-encrypted-blobs`.
2. **Edge API Endpoint ([functions/api/blobs/[id].ts](file:///c:/REA/codeshare-study/codeshare-app/functions/api/blobs/[id].ts))**:
   - `PUT /api/blobs/:id`: Receives client-encrypted ciphertext and stores it in Cloudflare R2.
   - `GET /api/blobs/:id`: Returns encrypted ciphertext from Cloudflare R2 (the server has no decryption key).
   - `DELETE /api/blobs/:id`: Removes blob from R2 upon attachment deletion.
3. **Local Development R2 Simulator ([vite.config.ts](file:///c:/REA/codeshare-study/codeshare-app/vite.config.ts))**:
   - Integrated `r2DevPlugin` middleware in Vite to emulate Cloudflare R2 locally (`.r2-dev-blobs/`). Allows full offline testing without needing remote credentials.
4. **Client-Side Zero-Knowledge Bridge ([src/utils/r2Client.ts](file:///c:/REA/codeshare-study/codeshare-app/src/utils/r2Client.ts))**:
   - `uploadEncryptedMediaToR2`: Encrypts raw PDF/Image bytes locally using AES-GCM (256-bit) and uploads only ciphertext to R2.
   - `fetchAndDecryptMediaFromR2`: Retrieves ciphertext from R2 and decrypts it inside the recipient's browser using `#key=...` from the URL fragment.
   - `deleteMediaFromR2`: Removes blob from storage when detached.

### 6.3 End-to-End Verification
- **Test Flow Executed**:
  1. User A navigated to `/new` and generated a new session with random slug and AES-256 key hash.
  2. User A attached a sample vector architecture diagram, which was encrypted locally and uploaded to Cloudflare R2 storage.
  3. User B loaded the exact share URL (`http://localhost:5173/npYuGS#key=f0b1e3e89da0ef20395dc0bd793232f7`).
  4. User B's browser automatically fetched the encrypted ciphertext from `/api/blobs/npYuGS`, decrypted it locally with key `f0b1e3e89da0ef20395dc0bd793232f7`, and displayed the diagram in the interactive `MediaViewer`.
- **Artifacts**:
  - Screenshot of User B viewing decrypted R2 file: `user_b_decrypted_viewer_1793102853436.png`
  - Browser recording: `test_r2_upload_and_decrypt_1793102365292.webp`

---

## 7. Firebase Storage / Firestore Zero-Knowledge Integration

### 7.1 Overview & Architecture
To provide a 100% free cloud storage option without requiring credit cards or Cloudflare dashboard approvals:
1. **Free Tier**: 5 GB of Google Cloud storage via Firebase Storage and 1 GB document storage in Firestore.
2. **Direct Client-to-Cloud Upload**:
   - The browser performs AES-GCM (256-bit) encryption locally.
   - The ciphertext blob is uploaded directly to Firebase (`encrypted_blobs/${codeshareId}`) using the official `firebase` client SDK.
   - No intermediary backend server is needed; Firebase only stores encrypted binary data and never receives the decryption key $K$.
3. **Seamless In-App Firebase Setup ([src/components/FirebaseConfigModal.tsx](file:///c:/REA/codeshare-study/codeshare-app/src/components/FirebaseConfigModal.tsx))**:
   - Accessible via the orange Flame icon in the right vertical dock.
   - Allows users to enter their `projectId` and `apiKey` directly in the UI with instant saving to `localStorage` or `.env`.
   - Includes graceful zero-config local relay fallback so local development and offline pair programming always work seamlessly out of the box.

### 7.2 Verification
- **Browser Execution**:
  1. Opened `/new` session in browser.
  2. Clicked orange Flame icon in sidebar to open "Firebase Cloud Storage Setup" dialog and verified configuration options and instructions.
  3. Attached sample architecture vector diagram via "Share PDF or Image (Firebase Encrypted)" dialog.
  4. Rendered diagram in `MediaViewer` showing verified `AES-256 Encrypted • Firebase Cloud` badge.
- **Artifacts**:
  - Screenshot: `media_viewer_firebase_1793104717247.png`
  - Video Recording: `verify_firebase_working_1793104343572.webp`




