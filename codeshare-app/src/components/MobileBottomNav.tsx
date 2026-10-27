import React, { useState } from 'react';
import {
  FileCode,
  Layers,
  PlusCircle,
  Paperclip,
  MessageSquare,
  SlidersHorizontal,
  Code2,
  FileText,
  Braces,
  AlignLeft,
  X,
} from 'lucide-react';
import type { CellType } from '../types';

interface MobileBottomNavProps {
  isNotebookMode: boolean;
  onToggleNotebookMode: (isNotebook: boolean) => void;
  cellCount: number;
  onAddCell: (type: CellType) => void;
  attachedCount: number;
  onOpenFiles: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  unreadChatCount: number;
  onOpenDrawer: () => void;
  viewOnly: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  isNotebookMode,
  onToggleNotebookMode,
  cellCount,
  onAddCell,
  attachedCount,
  onOpenFiles,
  isChatOpen,
  onToggleChat,
  unreadChatCount,
  onOpenDrawer,
  viewOnly,
}) => {
  const [isAddCellMenuOpen, setIsAddCellMenuOpen] = useState(false);

  const handleSelectCellType = (type: CellType) => {
    onAddCell(type);
    setIsAddCellMenuOpen(false);
  };

  return (
    <>
      {/* Quick Add Cell Popover on Mobile */}
      {isAddCellMenuOpen && (
        <div className="mobile-add-cell-overlay" onClick={() => setIsAddCellMenuOpen(false)}>
          <div
            className="mobile-add-cell-sheet"
            onClick={(e) => e.stopPropagation()}
            role="menu"
            aria-label="Add cell format options"
          >
            <div className="mobile-add-cell-header">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Insert New Cell</span>
              <button
                className="btn-icon"
                onClick={() => setIsAddCellMenuOpen(false)}
                style={{ padding: '0.2rem' }}
                aria-label="Close add cell menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-add-cell-grid">
              <button
                className="mobile-cell-type-btn"
                onClick={() => handleSelectCellType('code')}
              >
                <div className="mobile-cell-type-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                  <Code2 size={20} />
                </div>
                <div className="mobile-cell-type-info">
                  <div className="mobile-cell-type-name">Code Block</div>
                  <div className="mobile-cell-type-desc">Syntax highlighted code with live autocomplete</div>
                </div>
              </button>

              <button
                className="mobile-cell-type-btn"
                onClick={() => handleSelectCellType('markdown')}
              >
                <div className="mobile-cell-type-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <FileText size={20} />
                </div>
                <div className="mobile-cell-type-info">
                  <div className="mobile-cell-type-name">Markdown</div>
                  <div className="mobile-cell-type-desc">Rich notes, checklists, headers & live preview</div>
                </div>
              </button>

              <button
                className="mobile-cell-type-btn"
                onClick={() => handleSelectCellType('json')}
              >
                <div className="mobile-cell-type-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <Braces size={20} />
                </div>
                <div className="mobile-cell-type-info">
                  <div className="mobile-cell-type-name">JSON Data</div>
                  <div className="mobile-cell-type-desc">Formatted payloads, schema & structured configs</div>
                </div>
              </button>

              <button
                className="mobile-cell-type-btn"
                onClick={() => handleSelectCellType('text')}
              >
                <div className="mobile-cell-type-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                  <AlignLeft size={20} />
                </div>
                <div className="mobile-cell-type-info">
                  <div className="mobile-cell-type-name">Plain Text</div>
                  <div className="mobile-cell-type-desc">Unformatted scratchpad, logs & scratch notes</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation bar">
        {/* Toggle Single / Notebook */}
        <button
          className={`mobile-nav-item ${isNotebookMode ? 'is-active' : ''}`}
          onClick={() => onToggleNotebookMode(!isNotebookMode)}
          aria-label={isNotebookMode ? "Switch to single file editor" : "Switch to notebook view"}
        >
          {isNotebookMode ? <Layers size={18} /> : <FileCode size={18} />}
          <span>{isNotebookMode ? `Cells (${cellCount})` : 'Single'}</span>
        </button>

        {/* Quick Add Cell */}
        {!viewOnly && (
          <button
            className={`mobile-nav-item ${isAddCellMenuOpen ? 'is-active' : ''}`}
            onClick={() => setIsAddCellMenuOpen(!isAddCellMenuOpen)}
            aria-label="Add a new cell"
          >
            <PlusCircle size={20} color="#60a5fa" />
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>+ Cell</span>
          </button>
        )}

        {/* Attached Files */}
        <button
          className="mobile-nav-item"
          onClick={onOpenFiles}
          aria-label="Open attached files"
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Paperclip size={18} color={attachedCount > 0 ? '#10b981' : 'currentColor'} />
            {attachedCount > 0 && (
              <span className="mobile-nav-badge" style={{ backgroundColor: '#10b981' }}>
                {attachedCount}
              </span>
            )}
          </div>
          <span>Files</span>
        </button>

        {/* Chat */}
        <button
          className={`mobile-nav-item ${isChatOpen ? 'is-active' : ''}`}
          onClick={onToggleChat}
          aria-label="Open collaborator chat"
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <MessageSquare size={18} color={isChatOpen ? '#3b82f6' : 'currentColor'} />
            {unreadChatCount > 0 && (
              <span className="mobile-nav-badge" style={{ backgroundColor: '#ef4444' }}>
                {unreadChatCount}
              </span>
            )}
          </div>
          <span>Chat</span>
        </button>

        {/* Tools / More */}
        <button
          className="mobile-nav-item"
          onClick={onOpenDrawer}
          aria-label="Open tools and settings drawer"
        >
          <SlidersHorizontal size={18} />
          <span>Tools</span>
        </button>
      </nav>
    </>
  );
};
