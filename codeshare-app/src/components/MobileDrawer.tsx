import React from 'react';
import {
  X,
  FileCode,
  Layers,
  Settings,
  Download,
  Share2,
  Lock,
  Unlock,
  Bookmark,
  Library,
  User,
  LogIn,
  LogOut,
  Plus,
  Paperclip,
  Check,
  Copy,
} from 'lucide-react';
import type { EditorSettings, SyntaxMode, ExpirationOption, User as UserType } from '../types';
import { SYNTAX_OPTIONS } from '../utils/languages';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onUpdateTitle: (val: string) => void;
  settings: EditorSettings;
  onUpdateSettings: (settings: EditorSettings) => void;
  viewOnly: boolean;
  onToggleViewOnly: (val: boolean) => void;
  expiration: ExpirationOption;
  onUpdateExpiration: (exp: ExpirationOption) => void;
  codeshareId: string | null;
  shareUrl?: string;
  onOpenShare: () => void;
  onDownload: () => void;
  onSaveCodeshare: () => void;
  onOpenSavedLibrary?: () => void;
  onNewCodeshare: () => void;
  currentUser: UserType | null;
  onLogout?: () => void;
  onNavigate: (path: string) => void;
  isNotebookMode: boolean;
  onToggleNotebookMode: (isNotebook: boolean) => void;
  cellCount: number;
  attachedCount: number;
  onOpenFileUpload?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  title,
  onUpdateTitle,
  settings,
  onUpdateSettings,
  viewOnly,
  onToggleViewOnly,
  expiration,
  onUpdateExpiration,
  codeshareId,
  shareUrl,
  onOpenShare,
  onDownload,
  onSaveCodeshare,
  onOpenSavedLibrary,
  onNewCodeshare,
  currentUser,
  onLogout,
  onNavigate,
  isNotebookMode,
  onToggleNotebookMode,
  cellCount,
  attachedCount,
  onOpenFileUpload,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        const t = document.createElement('textarea');
        t.value = shareUrl;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div
        className="mobile-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Mobile workspace menu"
      >
        {/* Pull handle bar */}
        <div className="mobile-drawer-handle" />

        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="#3b82f6" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                Workspace & Tools
              </h3>
              {codeshareId && (
                <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                  Room: <code style={{ color: '#60a5fa' }}>{codeshareId}</code>
                </div>
              )}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="mobile-drawer-body">
          {/* Section: Document Title */}
          <div className="mobile-drawer-section">
            <label className="mobile-drawer-label">Document Title</label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="e.g. API Gateway Handler"
              disabled={viewOnly}
              style={{ fontSize: '0.9rem', padding: '0.55rem 0.75rem' }}
            />
          </div>

          {/* Section: Mode Switcher */}
          <div className="mobile-drawer-section">
            <label className="mobile-drawer-label">Editor Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className={`btn ${!isNotebookMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  onToggleNotebookMode(false);
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <FileCode size={15} />
                <span>Single File</span>
              </button>
              <button
                className={`btn ${isNotebookMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  onToggleNotebookMode(true);
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Layers size={15} />
                <span>Notebook ({cellCount})</span>
              </button>
            </div>
          </div>

          {/* Section: Quick Actions */}
          <div className="mobile-drawer-section">
            <label className="mobile-drawer-label">Quick Actions</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onSaveCodeshare();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                <Bookmark size={15} color="#10b981" />
                <span>Save to Library</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  onOpenShare();
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                <Share2 size={15} color="#3b82f6" />
                <span>Share Room</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleCopyLink}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  onDownload();
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                <Download size={15} color="#8b5cf6" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Section: Syntax & Tab Size */}
          <div className="mobile-drawer-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="mobile-drawer-label">Language</label>
                <select
                  className="form-control"
                  value={settings.modeName}
                  onChange={(e) => onUpdateSettings({ ...settings, modeName: e.target.value as SyntaxMode })}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem' }}
                >
                  {SYNTAX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mobile-drawer-label">Tab Size</label>
                <select
                  className="form-control"
                  value={settings.tabSize}
                  onChange={(e) => onUpdateSettings({ ...settings, tabSize: Number(e.target.value) as 2 | 4 | 6 | 8 })}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem' }}
                >
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                  <option value={8}>8 Spaces</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Link Expiration */}
          <div className="mobile-drawer-section">
            <label className="mobile-drawer-label">Link Expiration</label>
            <select
              className="form-control"
              value={expiration}
              onChange={(e) => onUpdateExpiration(e.target.value as ExpirationOption)}
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem' }}
            >
              <option value="never">Never (Permanent Snippet)</option>
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>

          {/* Section: View-Only Toggle */}
          <div className="mobile-drawer-section">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {viewOnly ? <Lock size={16} color="#f59e0b" /> : <Unlock size={16} color="#10b981" />}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    {viewOnly ? 'View-Only Mode' : 'Collaborative Editing'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {viewOnly ? 'Editing is locked' : 'Collaborators can edit'}
                  </div>
                </div>
              </div>
              <button
                className={`btn btn-sm ${viewOnly ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onToggleViewOnly(!viewOnly)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {viewOnly ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>

          {/* Section: Attached Files */}
          <div className="mobile-drawer-section">
            <label className="mobile-drawer-label">Attached Files ({attachedCount})</label>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (onOpenFileUpload) onOpenFileUpload();
                onClose();
              }}
              style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
            >
              <Paperclip size={15} color="#3b82f6" />
              <span>{attachedCount > 0 ? `Manage Attached Files (${attachedCount})` : 'Attach PDF / Images'}</span>
            </button>
          </div>

          {/* Section: Saved Library & New Room */}
          <div className="mobile-drawer-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (onOpenSavedLibrary) onOpenSavedLibrary();
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                <Library size={15} color="#60a5fa" />
                <span>Saved Library</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  onNewCodeshare();
                  onClose();
                }}
                style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
              >
                <Plus size={15} color="#10b981" />
                <span>New Room</span>
              </button>
            </div>
          </div>

          {/* Section: Account & Auth */}
          <div className="mobile-drawer-section" style={{ borderBottom: 'none' }}>
            <label className="mobile-drawer-label">Account</label>
            {currentUser && !currentUser.isAnonymous ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="#10b981" />
                  <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                    {currentUser.name || currentUser.email}
                  </div>
                </div>
                {onLogout && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <LogOut size={13} />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onNavigate('/login');
                    onClose();
                  }}
                  style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <LogIn size={15} />
                  <span>Log In</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onNavigate('/register');
                    onClose();
                  }}
                  style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
