import React, { useState } from 'react';
import { Code2, Clock, Users, Bookmark, BookmarkCheck, LogIn, UserCheck, Paperclip, FileText, Image as ImageIcon, ShieldCheck, LogOut, Check, Copy, Plus, Library, MessageSquare } from 'lucide-react';
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
  attachedMediaList?: AttachedMedia[];
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onOpenFileUpload?: () => void;
  expiration?: ExpirationOption;
  onLogout?: () => void;
  shareUrl?: string;
  isSaved?: boolean;
  isSyncing?: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  unreadChatCount?: number;
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
  attachedMediaList = [],
  activeTab = 'code',
  onTabChange,
  onOpenFileUpload,
  expiration = 'never',
  onLogout,
  shareUrl,
  isSaved = false,
  isSyncing = false,
  onToggleChat,
  isChatOpen = false,
  unreadChatCount = 0,
}) => {
  const isEditor = Boolean(codeshareId && currentPath.startsWith('/'));
  const [quickCopied, setQuickCopied] = useState(false);

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveCodeshare) onSaveCodeshare();
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
            className="btn btn-sm btn-secondary nav-action-btn"
            onClick={onNewCodeshare}
            title="Create a new PasteCodex room"
            style={{
              padding: '0.3rem 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.775rem',
              marginLeft: '0.25rem',
            }}
          >
            <Plus size={14} color="#60a5fa" />
            <span className="nav-btn-text">New</span>
          </button>
        )}

        {isEditor && docTitle && (
          <span className="header__title" title={docTitle}>
            {docTitle}
          </span>
        )}

        {/* Content Tabs (Code vs Attached Files) */}
        {(() => {
          const mediaItems = attachedMediaList.length > 0 ? attachedMediaList : (attachedMedia ? [attachedMedia] : []);
          if (!isEditor || mediaItems.length === 0 || !onTabChange) return null;
          return (
            <div
              className="header__tabs"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                marginLeft: '0.5rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                maxWidth: '320px',
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
                  flexShrink: 0,
                }}
              >
                <Code2 size={13} />
                <span className="nav-btn-text">Code</span>
              </button>

              {mediaItems.map((m) => {
                const isSelected = activeTab === m.id || (activeTab === m.type && mediaItems.length === 1);
                return (
                  <button
                    key={m.id}
                    onClick={() => onTabChange(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.775rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    title={m.name}
                  >
                    {m.type === 'pdf' ? (
                      <FileText size={13} color={isSelected ? '#fff' : '#ef4444'} />
                    ) : (
                      <ImageIcon size={13} color={isSelected ? '#fff' : '#3b82f6'} />
                    )}
                    <span
                      className="header-tab-filename"
                      style={{ maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="header__right">
        {isEditor && (
          <>
            {/* Live Instant Save Status Feedback */}
            <div
              className="badge-save-status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: isSyncing ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: isSyncing ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                color: isSyncing ? '#60a5fa' : '#34d399',
                fontWeight: 500,
              }}
              title={isSyncing ? 'Syncing updates...' : 'All changes saved instantly in real-time'}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isSyncing ? '#60a5fa' : '#10b981',
                  boxShadow: isSyncing ? '0 0 6px #60a5fa' : '0 0 6px #10b981',
                }}
              />
              <span className="nav-btn-text">{isSyncing ? 'Saving...' : 'Saved'}</span>
            </div>

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
                <span className="badge-expire-text">Permanent</span>
              </div>
            ) : (
              <div
                className="badge-expire pulse"
                onClick={onOpenShare}
                style={{ cursor: 'pointer' }}
                title={`This link auto-expires in ${expiration}. Click to change or make permanent.`}
              >
                <Clock size={13} color="#f59e0b" />
                <span className="badge-expire-text">{expiration}</span>
              </div>
            )}

            {/* Attach File Button */}
            <button
              className="btn btn-sm btn-secondary nav-action-btn"
              onClick={onOpenFileUpload}
              title="Attach PDF or Images to this encrypted Codeshare"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Paperclip size={14} color="#3b82f6" />
              <span className="nav-btn-text">
                {(attachedMediaList.length > 0 ? attachedMediaList.length : (attachedMedia ? 1 : 0)) > 0
                  ? `Files (${attachedMediaList.length > 0 ? attachedMediaList.length : 1})`
                  : 'Attach'}
              </span>
            </button>

            {/* Collaborator Chat Drawer Button */}
            {onToggleChat && (
              <button
                className={`btn btn-sm nav-action-btn ${isChatOpen ? 'btn-primary' : 'btn-secondary'}`}
                onClick={onToggleChat}
                title="Collaborator Real-time Chat (End-to-End Encrypted)"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', position: 'relative' }}
              >
                <MessageSquare size={14} />
                <span className="nav-btn-text">Chat</span>
                {unreadChatCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    }}
                  >
                    {unreadChatCount}
                  </span>
                )}
              </button>
            )}

            {/* Save Button with Visual Feedback */}
            <button
              className={`btn btn-sm nav-action-btn ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onSaveCodeshare}
              title={isSaved ? "Saved in your library (click to re-sync)" : "Save to your PasteCodex library"}
              style={isSaved ? { borderColor: '#10b981', color: '#34d399' } : undefined}
            >
              {isSaved ? <BookmarkCheck size={14} color="#10b981" /> : <Bookmark size={14} />}
              <span className="nav-btn-text">{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              className="btn btn-sm btn-secondary nav-action-btn"
              onClick={onOpenShare}
              title="Share URL with collaborators"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={14} />
              <span className="nav-btn-text">Share</span>
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
                className="btn btn-sm btn-secondary nav-action-btn"
                onClick={handleQuickCopy}
                title="Instantly copy share link"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                {quickCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span className="nav-btn-text" style={{ fontSize: '0.75rem' }}>{quickCopied ? 'Copied' : 'Copy'}</span>
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


