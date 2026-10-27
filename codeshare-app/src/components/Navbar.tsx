import React, { useState } from 'react';
import { Code2, Clock, Users, Bookmark, BookmarkCheck, LogIn, UserCheck, Paperclip, FileText, Image as ImageIcon, ShieldCheck, LogOut, Check, Copy, Plus, Library } from 'lucide-react';
import type { User, Collaborator, AttachedMedia, ActiveTab, ExpirationOption } from '../types';

interface NavbarProps {
  currentPath: string;
  codeshareId?: string;
  docTitle?: string;
  viewOnly?: boolean;
  onNavigate: (path: string) => void;
  onOpenShare?: () => void;
  onSaveCodeshare?: () => void;
  onOpenSavedLibrary?: () => void;
  onNewCodeshare?: () => void;
  currentUser: User | null;
  collaborators?: Collaborator[];
  attachedMedia?: AttachedMedia | null;
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onOpenFileUpload?: () => void;
  expiration?: ExpirationOption;
  onLogout?: () => void;
  shareUrl?: string;
  isSaved?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  codeshareId,
  docTitle,
  onNavigate,
  onOpenShare,
  onSaveCodeshare,
  onOpenSavedLibrary,
  onNewCodeshare,
  currentUser,
  collaborators = [],
  attachedMedia,
  activeTab = 'code',
  onTabChange,
  onOpenFileUpload,
  expiration = 'never',
  onLogout,
  shareUrl,
  isSaved = false,
}) => {
  const isEditor = Boolean(codeshareId && currentPath.startsWith('/'));
  const [quickCopied, setQuickCopied] = useState(false);

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shareUrl) {
      if (onOpenShare) onOpenShare();
      return;
    }
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
      setQuickCopied(true);
      setTimeout(() => setQuickCopied(false), 2000);
    } catch {
      if (onOpenShare) onOpenShare();
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <a
          href="/"
          className="header__logo"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
        >
          <Code2 size={24} color="#3b82f6" />
          <span>PasteCodex</span>
          <span className="header__logo-badge">v3.40</span>
        </a>

        {/* Quick Create New Page Button */}
        {onNewCodeshare && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onNewCodeshare}
            title="Create a new PasteCodex room"
            style={{
              padding: '0.3rem 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.775rem',
              marginLeft: '0.5rem',
            }}
          >
            <Plus size={14} color="#60a5fa" />
            <span>New</span>
          </button>
        )}

        {isEditor && docTitle && (
          <span className="header__title" title={docTitle}>
            {docTitle}
          </span>
        )}

        {/* Content Tabs (Code vs Attached PDF/Image) */}
        {isEditor && attachedMedia && onTabChange && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              marginLeft: '0.75rem',
            }}
          >
            <button
              onClick={() => onTabChange('code')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                fontWeight: activeTab === 'code' ? 600 : 400,
                color: activeTab === 'code' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab === 'code' ? 'var(--color-primary)' : 'transparent',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Code2 size={13} />
              <span>Code</span>
            </button>

            <button
              onClick={() => onTabChange(attachedMedia.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                fontSize: '0.775rem',
                fontWeight: activeTab !== 'code' ? 600 : 400,
                color: activeTab !== 'code' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab !== 'code' ? 'var(--color-primary)' : 'transparent',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={attachedMedia.name}
            >
              {attachedMedia.type === 'pdf' ? (
                <FileText size={13} color={activeTab === 'pdf' ? '#fff' : '#ef4444'} />
              ) : (
                <ImageIcon size={13} color={activeTab === 'image' ? '#fff' : '#3b82f6'} />
              )}
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachedMedia.name}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="header__right">
        {isEditor && (
          <>
            {/* Dynamic Expiration Badge (Optional Expiration) */}
            {expiration === 'never' ? (
              <div
                className="badge-expire"
                onClick={onOpenShare}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  cursor: 'pointer',
                }}
                title="Expiration is optional. Currently set to Never expire. Click to configure."
              >
                <ShieldCheck size={13} color="#10b981" />
                <span>Never Expires</span>
              </div>
            ) : (
              <div
                className="badge-expire pulse"
                onClick={onOpenShare}
                style={{ cursor: 'pointer' }}
                title={`This link auto-expires in ${expiration}. Click to change or make permanent.`}
              >
                <Clock size={13} color="#f59e0b" />
                <span>Expires in {expiration}</span>
              </div>
            )}

            {/* Attach File Button */}
            <button
              className="btn btn-sm btn-secondary"
              onClick={onOpenFileUpload}
              title="Attach PDF or Image to this encrypted Codeshare"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Paperclip size={14} color="#3b82f6" />
              <span>{attachedMedia ? 'Replace File' : 'Attach File'}</span>
            </button>

            {/* Save Button with Visual Feedback */}
            <button
              className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onSaveCodeshare}
              title={isSaved ? "Saved in your library (click to re-sync)" : "Save to your PasteCodex library"}
              style={isSaved ? { borderColor: '#10b981', color: '#34d399' } : undefined}
            >
              {isSaved ? <BookmarkCheck size={14} color="#10b981" /> : <Bookmark size={14} />}
              <span>{isSaved ? 'Saved ✓' : 'Save PasteCodex'}</span>
            </button>

            <button
              className="btn btn-sm btn-secondary"
              onClick={onOpenShare}
              title="Share URL with collaborators"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={14} />
              <span>Share</span>
              {collaborators.length > 0 && (
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '2px'
                }}>
                  {collaborators.length}
                </span>
              )}
            </button>

            {/* Instant Quick-Copy Button */}
            {shareUrl && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleQuickCopy}
                title="Instantly copy share link"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                {quickCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span style={{ fontSize: '0.75rem' }}>{quickCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </>
        )}

        {/* Saved Codeshares Library Button */}
        {onOpenSavedLibrary && currentUser && !currentUser.isAnonymous && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onOpenSavedLibrary}
            title="View your saved codeshares library"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Library size={14} color="#60a5fa" />
            <span>Saved ({currentUser.savedCodeshares.length})</span>
          </button>
        )}

        {currentUser && !currentUser.isAnonymous ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.85rem', cursor: onOpenSavedLibrary ? 'pointer' : 'default' }}
              onClick={onOpenSavedLibrary}
              title="Click to view saved codeshares"
            >
              <UserCheck size={16} />
              <span>{currentUser.name || currentUser.email}</span>
            </div>
            {onLogout && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={onLogout}
                title="Log out"
                style={{ padding: '0.3rem 0.5rem', color: 'var(--text-muted)' }}
              >
                <LogOut size={13} />
                <span style={{ fontSize: '0.75rem' }}>Log out</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onNavigate('/login')}
            >
              <LogIn size={14} />
              <span>Log In</span>
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onNavigate('/register')}
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  );
};


