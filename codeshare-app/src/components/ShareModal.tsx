import React, { useState } from 'react';
import { X, Copy, Check, Lock, ShieldCheck, Users, FileText, Image as ImageIcon, Key, Clock } from 'lucide-react';
import type { Collaborator, AttachedMedia, ExpirationOption } from '../types';

interface ShareModalProps {
  codeshareId: string;
  isOpen: boolean;
  onClose: () => void;
  viewOnly: boolean;
  onToggleViewOnly: (val: boolean) => void;
  collaborators: Collaborator[];
  isOwner?: boolean;
  encryptionKey?: string;
  attachedMedia?: AttachedMedia | null;
  attachedMediaList?: AttachedMedia[];
  expiration: ExpirationOption;
  onUpdateExpiration: (exp: ExpirationOption) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  codeshareId,
  isOpen,
  onClose,
  viewOnly,
  onToggleViewOnly,
  collaborators,
  encryptionKey = '',
  attachedMedia,
  attachedMediaList = [],
  expiration,
  onUpdateExpiration,
}) => {
  const [copied, setCopied] = useState(false);
  const [useEncryptedLink, setUseEncryptedLink] = useState(true);

  if (!isOpen) return null;

  const baseUrl = `${window.location.origin}/${codeshareId}`;
  const shareUrl = useEncryptedLink ? `${baseUrl}#key=${encryptionKey}` : baseUrl;

  // Instant zero-latency copy with immediate visual feedback
  const handleCopy = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {useEncryptedLink ? (
              <ShieldCheck size={20} color="#10b981" />
            ) : (
              <Users size={20} color="#3b82f6" />
            )}
            <h4 className="modal-title">Share Codeshare</h4>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Anyone with access to this URL will be able to access your code
            {(() => {
              const all = attachedMediaList.length > 0 ? attachedMediaList : (attachedMedia ? [attachedMedia] : []);
              if (all.length === 1) return ` and encrypted ${all[0].name}`;
              if (all.length > 1) return ` and ${all.length} encrypted attached files`;
              return '';
            })()} in real time.
          </p>

          {(() => {
            const all = attachedMediaList.length > 0 ? attachedMediaList : (attachedMedia ? [attachedMedia] : []);
            if (all.length === 0) return null;
            return (
              <div
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <strong style={{ color: '#fff' }}>Attached Files ({all.length}):</strong>
                  <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>🔒 Encrypted in Link</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '110px', overflowY: 'auto' }}>
                  {all.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      {item.type === 'pdf' ? <FileText size={14} color="#ef4444" /> : <ImageIcon size={14} color="#3b82f6" />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="share-url" style={{ margin: 0 }}>
                {useEncryptedLink ? 'Encrypted Share Link' : 'Standard Share Link'}
              </label>
              {useEncryptedLink && (
                <span style={{ color: '#10b981', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Key size={12} /> Key in URL Hash
                </span>
              )}
            </div>
            <div className="url-copy-group">
              <input
                id="share-url"
                type="text"
                className="url-copy-input"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="btn btn-primary"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            {copied && (
              <span className="copy-feedback">
                <Check size={14} /> Link copied to clipboard!
              </span>
            )}
          </div>

          {/* Encryption Toggle Switch */}
          <div className="switch-container" style={{ marginTop: '1.25rem' }}>
            <div className="switch-label-wrap">
              <span className="switch-label-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} color="#10b981" />
                <span>Zero-Knowledge Encryption (AES-GCM)</span>
              </span>
              <span className="switch-label-desc">
                Includes the secret key in the link fragment (#key=...). Browsers never transmit hash fragments to web servers, guaranteeing zero-knowledge privacy.
              </span>
            </div>
            <div
              className={`toggle-switch ${useEncryptedLink ? 'is-checked' : ''}`}
              onClick={() => setUseEncryptedLink(!useEncryptedLink)}
              role="switch"
              aria-checked={useEncryptedLink}
              title="Toggle Zero-Knowledge Link Encryption"
            >
              <div className="toggle-handle" />
            </div>
          </div>

          {/* Optional Link Expiration */}
          <div className="form-field" style={{ marginTop: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="link-expiration" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} color="#f59e0b" />
                <span>Link Expiration (Optional)</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: expiration === 'never' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                {expiration === 'never' ? '✓ Permanent Link' : 'Auto-expires'}
              </span>
            </div>
            <select
              id="link-expiration"
              className="form-control"
              value={expiration}
              onChange={(e) => onUpdateExpiration(e.target.value as ExpirationOption)}
            >
              <option value="never">Never (Permanent link - No Expiry)</option>
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours (Standard)</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              {expiration === 'never'
                ? 'This link is permanent and will never expire.'
                : `This link will automatically expire after ${expiration}.`}
            </div>
          </div>

          {/* View Only Switch */}
          <div className="switch-container">
            <div className="switch-label-wrap">
              <span className="switch-label-title">"View only" mode</span>
              <span className="switch-label-desc">
                Turn on "view only" mode if you don't want others to edit the code.
              </span>
            </div>
            <div
              className={`toggle-switch ${viewOnly ? 'is-checked' : ''}`}
              onClick={() => onToggleViewOnly(!viewOnly)}
              role="switch"
              aria-checked={viewOnly}
              title="Toggle View Only Mode"
            >
              <div className="toggle-handle" />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Users size={15} />
              <span>Active Collaborators ({collaborators.length})</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-light)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: c.color,
                      display: 'inline-block',
                    }}
                  />
                  <span>{c.name}</span>
                  {c.isMe && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>(You)</span>}
                </div>
              ))}
            </div>
          </div>

          {viewOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', color: 'var(--color-warning)', fontSize: '0.825rem' }}>
              <Lock size={14} />
              <span>Editor is currently locked for other visitors.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
