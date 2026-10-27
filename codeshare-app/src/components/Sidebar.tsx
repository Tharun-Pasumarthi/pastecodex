import React from 'react';
import { Settings, Download, Plus, Info, X, Check, Paperclip, FileText, Image as ImageIcon, MessageSquare } from 'lucide-react';
import type { EditorSettings, SyntaxMode, EditorTheme, KeymapMode, AttachedMedia } from '../types';
import { SYNTAX_OPTIONS } from '../utils/languages';

interface SidebarProps {
  settings: EditorSettings;
  title: string;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateSettings: (newSettings: EditorSettings) => void;
  onDownload: () => void;
  onNewCodeshare: () => void;
  activePanel: 'settings' | 'about' | null;
  onTogglePanel: (panel: 'settings' | 'about') => void;
  onClosePanel: () => void;
  attachedMedia?: AttachedMedia | null;
  attachedMediaList?: AttachedMedia[];
  onOpenFileUpload?: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  unreadChatCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  title,
  onUpdateTitle,
  onUpdateSettings,
  onDownload,
  onNewCodeshare,
  activePanel,
  onTogglePanel,
  onClosePanel,
  attachedMedia,
  attachedMediaList = [],
  onOpenFileUpload,
  onToggleChat,
  isChatOpen = false,
  unreadChatCount = 0,
}) => {
  return (
    <aside className={`cs-sidebar ${activePanel ? 'is-open' : ''}`}>
      <section className="cs-sidebar-panel">
        {activePanel === 'settings' && (
          <div className="cs-panel-content">
            <div className="cs-panel-header">
              <h3 className="cs-panel-title">Editor Settings</h3>
              <button className="btn-icon" onClick={onClosePanel} aria-label="Close settings">
                <X size={18} />
              </button>
            </div>

            <div className="form-field">
              <label htmlFor="doc-title">Document Title</label>
              <input
                id="doc-title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder="Codeshare title"
              />
            </div>

            <div className="form-field">
              <label htmlFor="modeName">Syntax</label>
              <select
                id="modeName"
                className="form-control"
                value={settings.modeName}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    modeName: e.target.value as SyntaxMode,
                  })
                }
              >
                {SYNTAX_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="tabSize">Tab Size</label>
              <select
                id="tabSize"
                className="form-control"
                value={settings.tabSize}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    tabSize: Number(e.target.value) as 2 | 4 | 6 | 8,
                  })
                }
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="6">6 spaces</option>
                <option value="8">8 spaces</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                className="form-control"
                value={settings.theme}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    theme: e.target.value as EditorTheme,
                  })
                }
              >
                <option value="monokai">Monokai (Default)</option>
                <option value="one-dark">One Dark</option>
                <option value="dracula">Dracula</option>
                <option value="light">Light Day</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="keymap">Keymap</label>
              <select
                id="keymap"
                className="form-control"
                value={settings.keymap}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    keymap: e.target.value as KeymapMode,
                  })
                }
              >
                <option value="default">Standard</option>
                <option value="sublime">Sublime</option>
                <option value="vim">Vim</option>
                <option value="emacs">Emacs</option>
              </select>
            </div>

            {(() => {
              const items = attachedMediaList.length > 0 ? attachedMediaList : (attachedMedia ? [attachedMedia] : []);
              if (items.length === 0) return null;
              return (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Attached Files ({items.length}):</span>
                    {onOpenFileUpload && (
                      <button onClick={onOpenFileUpload} style={{ fontSize: '0.75rem', color: '#60a5fa', cursor: 'pointer' }}>
                        Manage
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                    {items.map((m) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#fff' }}>
                        {m.type === 'pdf' ? <FileText size={14} color="#ef4444" style={{ flexShrink: 0 }} /> : <ImageIcon size={14} color="#3b82f6" style={{ flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontSize: '0.8rem' }}>
              <Check size={14} /> Settings auto-applied
            </div>
          </div>
        )}

        {activePanel === 'about' && (
          <div className="cs-panel-content">
            <div className="cs-panel-header">
              <h3 className="cs-panel-title">About PasteCodex</h3>
              <button className="btn-icon" onClick={onClosePanel} aria-label="Close about">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p>
                👩🏻‍💻 <strong>PasteCodex</strong> enables developers to share code in real-time. Write or paste code in your browser, share the URL, and collaborate with teammates globally.
              </p>
              <p>
                🔒 <strong>Zero-Knowledge Encryption</strong>: Share code, PDF files, and images safely using client-side AES-GCM (256-bit) encryption keys stored in the URL fragment (`#key=...`).
              </p>
              <p>
                ⚡ Features full syntax highlighting, customizable tab sizing, instant file downloads, and secure view-only permissions.
              </p>
            </div>
          </div>
        )}
      </section>

      <nav className="cs-sidebar-nav">
        <ul>
          <li>
            <button
              className={`btn-icon ${activePanel === 'settings' ? 'is-active' : ''}`}
              onClick={() => onTogglePanel('settings')}
              title="Editor Settings"
            >
              <Settings size={20} />
            </button>
          </li>
          <li>
            <button
              className="btn-icon"
              onClick={onOpenFileUpload}
              title={(attachedMediaList.length > 0 ? attachedMediaList.length : (attachedMedia ? 1 : 0)) > 0 ? `Manage Attached Files (${attachedMediaList.length > 0 ? attachedMediaList.length : 1})` : "Attach PDF / Images"}
              style={{ position: 'relative' }}
            >
              <Paperclip size={20} color={(attachedMediaList.length > 0 || attachedMedia) ? '#10b981' : 'currentColor'} />
              {(attachedMediaList.length > 0 || attachedMedia) && (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
              )}
            </button>
          </li>
          {onToggleChat && (
            <li>
              <button
                className={`btn-icon ${isChatOpen ? 'is-active' : ''}`}
                onClick={onToggleChat}
                title="Collaborator Chat"
                style={{ position: 'relative' }}
              >
                <MessageSquare size={20} color={isChatOpen ? '#3b82f6' : 'currentColor'} />
                {unreadChatCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      minWidth: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </li>
          )}
          <li>
            <button
              id="codeshare-download-button"
              className="btn-icon"
              onClick={onDownload}
              title="Download Code or Attachment"
            >
              <Download size={20} />
            </button>
          </li>
          <li>
            <button
              className="btn-icon"
              onClick={onNewCodeshare}
              title="Create a New PasteCodex"
            >
              <Plus size={20} />
            </button>
          </li>
          <li>
            <button
              className={`btn-icon ${activePanel === 'about' ? 'is-active' : ''}`}
              onClick={() => onTogglePanel('about')}
              title="About / Help"
            >
              <Info size={20} />
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};
