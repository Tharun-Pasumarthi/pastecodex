import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  Users,
  FileText,
  Image as ImageIcon,
  Key,
  Clock,
  Link2,
  Sparkles,
  EyeOff,
  Loader2,
} from 'lucide-react';
import type { Collaborator, AttachedMedia, ExpirationOption } from '../types';
import { generateShareableUrl, shortenWithTinyUrl, sanitizeBrowserAddressBar } from '../utils/crypto';

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
  const [useStealthCloak, setUseStealthCloak] = useState(true);
  const [tinyUrl, setTinyUrl] = useState<string | null>(null);
  const [isGeneratingTinyUrl, setIsGeneratingTinyUrl] = useState(false);
  const [tinyCopied, setTinyCopied] = useState(false);
  const [addressBarCleaned, setAddressBarCleaned] = useState(false);

  if (!isOpen) return null;

  // Generate either stealth URL (masked key #s=...) or direct URL (#key=...)
  const shareUrl = useEncryptedLink
    ? generateShareableUrl(codeshareId, encryptionKey, viewOnly, useStealthCloak)
    : generateShareableUrl(codeshareId, undefined, viewOnly);

  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = () => {
    copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTinyUrl = () => {
    if (!tinyUrl) return;
    copyToClipboard(tinyUrl);
    setTinyCopied(true);
    setTimeout(() => setTinyCopied(false), 2000);
  };

  const handleCreateTinyUrl = async () => {
    setIsGeneratingTinyUrl(true);
    try {
      const short = await shortenWithTinyUrl(shareUrl);
      setTinyUrl(short);
    } catch {
      setTinyUrl(shareUrl);
    } finally {
      setIsGeneratingTinyUrl(false);
    }
  };

  const handleCleanAddressBar = () => {
    sanitizeBrowserAddressBar();
    setAddressBarCleaned(true);
    setTimeout(() => setAddressBarCleaned(false), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {useEncryptedLink ? (
              <ShieldCheck size={20} color="#10b981" />
            ) : (
              <Users size={20} color="#3b82f6" />
            )}
            <h4 className="modal-title">Share Secure Codeshare</h4>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Collaborators with this URL can view and edit in real time with client-side end-to-end encryption.
          </p>

          {/* Attached Files Notification */}
          {(() => {
            const all = attachedMediaList.length > 0 ? attachedMediaList : (attachedMedia ? [attachedMedia] : []);
            if (all.length === 0) return null;
            return (
              <div
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '90px', overflowY: 'auto' }}>
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

          {/* TINYURL / SHORT CLOAKED URL PROMINENT FEATURE */}
          <div
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sparkles size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                  TinyURL Short Link (Hides Key &amp; Content)
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.675rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                Zero-Leak
              </span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)', margin: '0 0 0.65rem' }}>
              Obfuscates and hides the room ID, contents, and secret encryption key behind a clean short link so onlookers cannot inspect the URL.
            </p>

            {tinyUrl ? (
              <div className="url-copy-group" style={{ marginBottom: '0.35rem' }}>
                <input
                  type="text"
                  className="url-copy-input"
                  readOnly
                  value={tinyUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{ color: '#60a5fa', fontWeight: 600 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCopyTinyUrl}
                  title="Copy TinyURL"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {tinyCopied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{tinyCopied ? 'Copied TinyURL!' : 'Copy TinyURL'}</span>
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleCreateTinyUrl}
                disabled={isGeneratingTinyUrl}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                {isGeneratingTinyUrl ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Shortening with TinyURL...</span>
                  </>
                ) : (
                  <>
                    <Link2 size={16} />
                    <span>Create TinyURL (Hide Key &amp; URL)</span>
                  </>
                )}
              </button>
            )}
            {tinyCopied && (
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={13} /> TinyURL copied to clipboard!
              </div>
            )}
          </div>

          {/* Standard / Cloaked Share URL */}
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="share-url" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                {useStealthCloak ? 'Cloaked Encrypted Link (Key Masked in #s=...)' : 'Direct Link (#key=...)'}
              </label>
              {useEncryptedLink && (
                <button
                  onClick={() => setUseStealthCloak(!useStealthCloak)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: useStealthCloak ? '#10b981' : '#f59e0b',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: 0,
                  }}
                  title={useStealthCloak ? "Key is obfuscated so casual observers cannot read it" : "Switch to stealth masked key"}
                >
                  {useStealthCloak ? <EyeOff size={13} /> : <Key size={13} />}
                  <span>{useStealthCloak ? 'Key Cloaked' : 'Key Visible'}</span>
                </button>
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
                className="btn btn-secondary"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            {copied && (
              <span className="copy-feedback">
                <Check size={14} /> Link copied to clipboard!
              </span>
            )}
          </div>

          {/* Hide Key from Browser URL Bar on this device */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <EyeOff size={16} color="#3b82f6" />
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                  Clean Address Bar
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                  Hide the secret key from your current browser URL bar to stop shoulder-surfers.
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleCleanAddressBar}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
            >
              {addressBarCleaned ? '✓ Cleared!' : 'Clean Now'}
            </button>
          </div>

          {/* Encryption Toggle Switch */}
          <div className="switch-container" style={{ marginTop: '1.15rem' }}>
            <div className="switch-label-wrap">
              <span className="switch-label-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} color="#10b981" />
                <span>Zero-Knowledge Encryption (AES-GCM 256-bit)</span>
              </span>
              <span className="switch-label-desc">
                Includes the secret key in the link fragment. Web servers never receive URL hash fragments, ensuring true zero-knowledge privacy.
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

          <div style={{ marginTop: '1.15rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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

