import React, { useState, useEffect } from 'react';
import { X, Flame, Check, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, type FirebaseConfig } from '../utils/firebaseStorage';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getFirebaseConfig();
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setProjectId(cfg.projectId || '');
        setStorageBucket(cfg.storageBucket || '');
        setMessagingSenderId(cfg.messagingSenderId || '');
        setAppId(cfg.appId || '');
      }
      setSavedSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      setError('Please provide at least your Firebase API Key and Project ID.');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveFirebaseConfig(config);
    setError(null);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    clearFirebaseConfig();
    setApiKey('');
    setProjectId('');
    setStorageBucket('');
    setMessagingSenderId('');
    setAppId('');
    setSavedSuccess(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={20} color="#f59e0b" />
            <h4 className="modal-title">Firebase Cloud Storage Setup</h4>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>
            Connect your free Google Firebase account (5 GB free storage) to store and share client-encrypted PDFs, images, and code over the internet.
          </p>

          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              <Check size={16} />
              <span>Firebase configuration saved! Ready to use.</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="fb-project-id">Project ID *</label>
            <input
              id="fb-project-id"
              type="text"
              className="form-control"
              placeholder="my-codeshare-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="fb-api-key">Web API Key *</label>
            <input
              id="fb-api-key"
              type="text"
              className="form-control"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="fb-storage-bucket">Storage Bucket (Optional)</label>
            <input
              id="fb-storage-bucket"
              type="text"
              className="form-control"
              placeholder="my-codeshare-project.appspot.com"
              value={storageBucket}
              onChange={(e) => setStorageBucket(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-dim)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', marginBottom: '0.35rem', fontWeight: 500 }}>
              <ExternalLink size={14} />
              <span>How to get your free Firebase keys:</span>
            </div>
            <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: '1.6' }}>
              <li>Visit <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>console.firebase.google.com</a> and click <strong>Create Project</strong>.</li>
              <li>Under Project Settings &gt; General &gt; Your apps, add a <strong>Web App</strong>.</li>
              <li>Copy and paste your <code>projectId</code> and <code>apiKey</code> above.</li>
              <li>In the Firebase sidebar, click <strong>Build &gt; Firestore Database</strong> (and/or <strong>Storage</strong>) and click <strong>Create</strong>.</li>
            </ol>
          </div>

          <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleClear}
              style={{ color: '#ef4444' }}
              title="Clear stored Firebase config"
            >
              <Trash2 size={14} />
              <span>Reset</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={16} />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
