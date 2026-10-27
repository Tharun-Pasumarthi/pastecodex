# Deployment, Operations, and Incident Response Guide

## 1. Environment Variable Reference

PasteCodex runs on a client-side zero-knowledge security architecture. No server-side secrets or private database credentials are required in client bundles.

| Variable Name | Required | Description | Example Placeholder |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Optional | Public Firebase API key for Firestore project | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional | Firebase auth domain | `codeshare-7aca3.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Optional | Firebase Project ID | `codeshare-7aca3` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Optional | Cloud Storage bucket name | `codeshare-7aca3.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional | FCM Sender ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Optional | Client Application ID | `1:1234567890:web:...` |

> [!NOTE]
> All credentials above are public client-side identifiers as defined by Google Firebase SDK design. The cryptographic keys securing documents (`#key=...`) are generated client-side and never sent to Firebase or any server.

---

## 2. Deployment Guide

### A. Production Build
```bash
npm run build
```
This runs TypeScript project compilation (`tsc -b`) and bundles production assets via Vite into `dist/`.

### B. Automated Testing Verification
```bash
npm test
```
Executes the native Node.js automated test runner across cryptographic integrity, file transfer state machine, and date/time formatting tests.

### C. Deploying to Firebase Hosting
```bash
firebase deploy --only hosting
```
Deploys pre-built static assets from `dist/` directly to Firebase Hosting CDN (`https://codeshare-7aca3.web.app`).

### D. Deploying to Cloudflare Pages / Workers
```bash
npx wrangler pages deploy dist/
```

---

## 3. Rollback Strategy
If an unexpected regression occurs in production:
1. **Firebase Hosting Rollback**:
   - Open Firebase Console -> Hosting -> Version History.
   - Click the three dots next to the previous known good deployment and click **Rollback**.
   - Or deploy the previous git commit:
     ```bash
     git checkout HEAD~1
     npm run build
     firebase deploy --only hosting
     ```
2. **Data Safety**:
   - Zero-knowledge encryption ensures that stored blobs in Firestore and local IndexedDB remain intact and forward-compatible.

---

## 4. Operational Monitoring and Incident Checklist

### Daily / Continuous Monitoring
- [ ] Monitor Firebase Console Usage / Firestore read/write quotas.
- [ ] Inspect client error logs and network status via `telemetry.getHealth()`.
- [ ] Verify that p95 document sync latency remains under 150 ms.

### Incident Response Procedures
1. **"Decryption Failure / Poisoned Hash" Alert**:
   - Symptom: Recipient sees `[Encrypted message]` or integrity error.
   - Root Cause: Missing `#key=` fragment in URL or truncated link copied by user.
   - Resolution: System automatically falls back to deterministic room key derivation. If link is truncated, prompt user to copy the complete URL.
2. **"Firestore Write Quota Exceeded" Alert**:
   - Symptom: Error saving document or uploading blob.
   - Action: Client continues functioning seamlessly via local `BroadcastChannel` and browser `IndexedDB`. Data is saved locally and will sync once quota resets.
