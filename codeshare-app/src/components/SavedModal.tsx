import React, { useState, useEffect } from 'react';
import { X, Bookmark, Code2, Trash2, ExternalLink, Plus, Clock } from 'lucide-react';
import type { User } from '../types';
import { fetchDocument } from '../utils/documentSync';

export interface SavedItemMeta {
  id: string;
  title: string;
  preview: string;
  language: string;
  savedAt: string;
  encryptionKey?: string;
  isLoading?: boolean;
}

interface SavedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenCodeshare: (id: string, key?: string) => void;
  onRemoveSaved: (id: string) => void;
  onNewCodeshare: () => void;
}

export const SavedModal: React.FC<SavedModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenCodeshare,
  onRemoveSaved,
  onNewCodeshare,
}) => {
  if (!isOpen) return null;

  const savedIds = currentUser?.savedCodeshares || [];
  const [items, setItems] = useState<SavedItemMeta[]>(() => {
    return savedIds.map((id) => {
      try {
        const cachedDoc = localStorage.getItem(`codeshare_doc_${id}`);
        if (cachedDoc) {
          const doc = JSON.parse(cachedDoc);
          return {
            id,
            title: doc.title || `Codeshare ${id}`,
            preview: (doc.content || '').slice(0, 120) || '// Empty code snippet',
            language: doc.settings?.modeName || 'javascript',
            savedAt: 'Saved in library',
            encryptionKey: doc.encryptionKey,
          };
        }
      } catch {
        // fallback
      }
      return {
        id,
        title: `Codeshare ${id}`,
        preview: 'Loading snippet...',
        language: 'code',
        savedAt: 'Saved',
        isLoading: true,
      };
    });
  });

  useEffect(() => {
    let isCancelled = false;
    savedIds.forEach((id) => {
      fetchDocument(id).then((docData) => {
        if (isCancelled || !docData) return;
        setItems((prev) =>
          prev.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                title: docData.title || item.title,
                preview: (docData.content || '').slice(0, 120) || '// Empty code snippet',
                language: docData.settings?.modeName || item.language,
                encryptionKey: docData.encryptionKey || item.encryptionKey,
                isLoading: false,
              };
            }
            return item;
          })
        );
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [savedIds.join(',')]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Bookmark size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                My Saved Snippets
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {items.length} {items.length === 1 ? 'snippet' : 'snippets'} saved to your account
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0.5rem 0' }}>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--text-muted)',
              }}
            >
              <Code2 size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
              <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.35rem' }}>
                No saved snippets yet
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '340px', margin: '0 auto 1.25rem' }}>
                Click "Save PasteCodex" on any editor page to bookmark it here for quick access anytime.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onNewCodeshare();
                }}
              >
                <Plus size={14} />
                <span>Create New Room</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.925rem',
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.language}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.775rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {item.preview}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                      <Clock size={12} />
                      <span>ID: /{item.id} • {item.savedAt}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        onClose();
                        onOpenCodeshare(item.id, item.encryptionKey);
                      }}
                      title="Open this Codeshare"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                    >
                      <ExternalLink size={13} />
                      <span>Open</span>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => onRemoveSaved(item.id)}
                      title="Remove from saved library"
                      style={{ color: '#ef4444', padding: '0.4rem' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              onClose();
              onNewCodeshare();
            }}
          >
            <Plus size={14} />
            <span>Create New Page</span>
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
