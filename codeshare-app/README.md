# Codeshare — Real-Time Collaborative Code & Encrypted File Sharing

A full-stack recreation of [Codeshare.io](https://codeshare.io/) built with React, TypeScript, Vite, and CodeMirror, featuring client-side zero-knowledge encrypted sharing for code, PDFs, and images.

---

## ✨ Features

- **Real-Time Code Collaboration**: Instant sub-millisecond bidirectional cross-tab & cross-browser synchronization powered by `BroadcastChannel` and a local server document relay.
- **Client-Side Zero-Knowledge Encryption**:
  - Code, attached PDFs, and images are encrypted locally using AES-GCM (256-bit).
  - Encryption keys stay in the URL hash fragment (`#key=...`) and are **never transmitted to any backend server**.
- **PDF & Image Attachment Support**: Attach and view documents and images directly alongside code with zoom, download, and remove capabilities.
- **Saved Codeshares Library**: Bookmarking and account library modal to save, preview, and reopen codeshares.
- **Optional Expiration**: Configure link expiration (`Never`, `1 hour`, `24 hours`, `7 days`, `30 days`).
- **Flexible Storage**:
  - **Zero-Setup Local Dev Relay**: Works 100% offline out-of-the-box (`.codeshare-dev-data/`).
  - **Optional Google Firebase Cloud**: Direct browser-to-cloud encrypted storage (5 GB free tier).
  - **Cloudflare Pages / Workers**: Ready for edge deployment.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Local Development Server
```bash
npm run dev
```

The application will be running at [http://localhost:5173/](http://localhost:5173/).

### 3. Build for Production
```bash
npm run build
```

---

## 🔒 Security Model

1. **URL Hash Cryptography**: In accordance with RFC 3986, browsers never send URL hash fragments (`#key=...`) to HTTP servers.
2. **AES-GCM (256-bit)**: Cryptographic keys and initialization vectors (IVs) are generated in the browser using the Web Crypto API (`window.crypto.subtle`).
3. **Ciphertext Storage**: Any data sent to the local relay or Firebase Cloud is already encrypted ciphertext. Without the `#key=...` from the shareable link, the data cannot be read by any server or intermediary.
