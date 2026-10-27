import React, { useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import type { TextCell, CellType, SyntaxMode, EditorTheme } from '../types';
import { getLanguageExtension, SYNTAX_OPTIONS } from '../utils/languages';
import {
  Code2,
  FileText,
  Braces,
  AlignLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Eye,
  Edit3,
  Minimize2,
  Maximize2,
} from 'lucide-react';

interface CellEditorProps {
  cell: TextCell;
  index: number;
  totalCells: number;
  theme: EditorTheme;
  viewOnly: boolean;
  onUpdateContent: (id: string, newContent: string) => void;
  onUpdateType: (id: string, newType: CellType, newLang: SyntaxMode) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (id: string) => void;
  onAddCellBelow: (index: number, type: CellType) => void;
}

export const CellEditor: React.FC<CellEditorProps> = ({
  cell,
  index,
  totalCells,
  theme,
  viewOnly,
  onUpdateContent,
  onUpdateType,
  onUpdateTitle,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAddCellBelow,
}) => {
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(Boolean(cell.collapsed));
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  const extensions = useMemo(() => {
    return getLanguageExtension(cell.language);
  }, [cell.language]);

  const getCellIcon = (type: CellType) => {
    switch (type) {
      case 'code':
        return <Code2 size={15} color="#3b82f6" />;
      case 'markdown':
        return <FileText size={15} color="#10b981" />;
      case 'json':
        return <Braces size={15} color="#f59e0b" />;
      case 'text':
      default:
        return <AlignLeft size={15} color="#8b5cf6" />;
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as CellType;
    let newLang: SyntaxMode = 'javascript';
    if (newType === 'markdown') newLang = 'markdown';
    else if (newType === 'json') newLang = 'json';
    else if (newType === 'text') newLang = 'plaintext';
    else newLang = cell.language === 'markdown' || cell.language === 'json' || cell.language === 'plaintext' ? 'javascript' : cell.language;
    onUpdateType(cell.id, newType, newLang);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateType(cell.id, cell.type, e.target.value as SyntaxMode);
  };

  return (
    <div
      className="notebook-cell-wrapper"
      style={{
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-light)',
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Cell Header Toolbar */}
      <div className={`cell-header ${isCollapsed ? 'is-collapsed' : ''}`}>
        <div className="cell-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-dim)',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}
            >
              #{index + 1}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
              {getCellIcon(cell.type)}
              <input
                type="text"
                value={cell.title || ''}
                onChange={(e) => onUpdateTitle(cell.id, e.target.value)}
                placeholder="Cell Label"
                disabled={viewOnly}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  outline: 'none',
                  width: '100%',
                  maxWidth: '160px',
                }}
              />
            </div>
          </div>

          {cell.type === 'markdown' && (
            <button
              className="btn-icon"
              onClick={() => setIsPreview(!isPreview)}
              title={isPreview ? 'Switch to Markdown Edit Mode' : 'Preview Rendered Markdown'}
              style={{
                color: isPreview ? '#10b981' : 'var(--text-muted)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
              }}
            >
              {isPreview ? <Edit3 size={13} /> : <Eye size={13} />}
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>
          )}
        </div>

        {/* Controls: Selectors & Actions */}
        <div className="cell-header-controls">
          {/* Cell Type & Language Selectors */}
          {!viewOnly ? (
            <div className="cell-header-selectors">
              <select
                value={cell.type}
                onChange={handleTypeChange}
                aria-label="Cell Format"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.45rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <option value="code">Code</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="text">Plain Text</option>
              </select>

              {cell.type === 'code' && (
                <select
                  value={cell.language}
                  onChange={handleLanguageChange}
                  aria-label="Code Syntax"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.45rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {SYNTAX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
              }}
            >
              {cell.type.toUpperCase()}{cell.type === 'code' ? ` (${cell.language})` : ''}
            </span>
          )}

          {/* Cell Actions */}
          <div className="cell-header-actions">
            <button
              className="btn-icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand Cell' : 'Collapse Cell'}
              style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
              aria-label={isCollapsed ? 'Expand Cell' : 'Collapse Cell'}
            >
              {isCollapsed ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>

            {!viewOnly && (
              <>
                <button
                  className="btn-icon"
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  title="Move Cell Up"
                  style={{
                    color: index === 0 ? 'var(--text-dim)' : 'var(--text-muted)',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    padding: '0.35rem',
                  }}
                  aria-label="Move cell up"
                >
                  <ChevronUp size={14} />
                </button>

                <button
                  className="btn-icon"
                  onClick={() => onMoveDown(index)}
                  disabled={index === totalCells - 1}
                  title="Move Cell Down"
                  style={{
                    color: index === totalCells - 1 ? 'var(--text-dim)' : 'var(--text-muted)',
                    cursor: index === totalCells - 1 ? 'not-allowed' : 'pointer',
                    padding: '0.35rem',
                  }}
                  aria-label="Move cell down"
                >
                  <ChevronDown size={14} />
                </button>

                <button
                  className="btn-icon"
                  onClick={() => onDuplicate(index)}
                  title="Duplicate Cell"
                  style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
                  aria-label="Duplicate cell"
                >
                  <Copy size={13} />
                </button>

                {totalCells > 1 && (
                  <button
                    className="btn-icon"
                    onClick={() => onDelete(cell.id)}
                    title="Delete Cell"
                    style={{ color: '#ef4444', padding: '0.35rem' }}
                    aria-label="Delete cell"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cell Body */}
      {!isCollapsed && (
        <div className="cell-body">
          {cell.type === 'markdown' && isPreview ? (
            <div
              className="markdown-rendered-view"
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                minHeight: '80px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {cell.content || <span style={{ color: 'var(--text-dim)' }}>// Empty markdown documentation</span>}
            </div>
          ) : (
            <div style={{ minHeight: '80px', maxHeight: '500px', overflow: 'auto' }}>
              <CodeMirror
                value={cell.content}
                theme={theme === 'light' ? 'light' : oneDark}
                extensions={extensions}
                onChange={(val) => {
                  if (viewOnly) return;
                  onUpdateContent(cell.id, val);
                }}
                readOnly={viewOnly}
                editable={!viewOnly}
                placeholder={
                  cell.type === 'markdown'
                    ? 'Write markdown documentation or notes here...'
                    : cell.type === 'json'
                    ? '{\n  "key": "value"\n}'
                    : '// Write or paste code snippet here...'
                }
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  foldGutter: true,
                  indentOnInput: true,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Interactive Divider to add new cell directly below */}
      {!viewOnly && (
        <div
          className="cell-insert-divider"
          onMouseEnter={() => setShowAddMenu(true)}
          onMouseLeave={() => setShowAddMenu(false)}
          style={{
            position: 'relative',
            height: showAddMenu ? '36px' : '6px',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showAddMenu ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          }}
        >
          {showAddMenu && (
            <div style={{ display: 'flex', gap: '0.4rem', zIndex: 5 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onAddCellBelow(index, 'code')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Code2 size={12} color="#3b82f6" /> + Code
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onAddCellBelow(index, 'markdown')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <FileText size={12} color="#10b981" /> + Markdown
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onAddCellBelow(index, 'json')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Braces size={12} color="#f59e0b" /> + JSON
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onAddCellBelow(index, 'text')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <AlignLeft size={12} color="#8b5cf6" /> + Text
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
