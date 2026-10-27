import React, { useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import type { EditorSettings, Collaborator, TextCell, CellType, SyntaxMode } from '../types';
import { getLanguageExtension } from '../utils/languages';
import { CellEditor } from './CellEditor';
import { createDefaultCell, serializeCellsToContent } from '../utils/cellUtils';
import {
  Lock,
  FileCode,
  CheckCircle2,
  Layers,
  FileText,
  Plus,
  Code2,
  Braces,
  AlignLeft,
} from 'lucide-react';

interface EditorWorkspaceProps {
  content: string;
  onChange: (val: string) => void;
  cells: TextCell[];
  onUpdateCells: (cells: TextCell[]) => void;
  settings: EditorSettings;
  viewOnly: boolean;
  collaborators: Collaborator[];
  isNotebookMode?: boolean;
  onToggleNotebookMode?: (isNotebook: boolean) => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  content,
  onChange,
  cells,
  onUpdateCells,
  settings,
  viewOnly,
  collaborators,
  isNotebookMode: controlledNotebookMode,
  onToggleNotebookMode,
}) => {
  const [internalNotebookMode, setInternalNotebookMode] = useState<boolean>(() => cells.length > 1);
  const isNotebookMode = typeof controlledNotebookMode === 'boolean' ? controlledNotebookMode : internalNotebookMode;
  const setIsNotebookMode = onToggleNotebookMode || setInternalNotebookMode;

  const extensions = useMemo(() => {
    return getLanguageExtension(settings.modeName);
  }, [settings.modeName]);

  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  const charCount = content.length;

  // Cell manipulation handlers
  const handleUpdateCellContent = (id: string, newContent: string) => {
    const updated = cells.map((c) => (c.id === id ? { ...c, content: newContent } : c));
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleUpdateCellType = (id: string, newType: CellType, newLang: SyntaxMode) => {
    const updated = cells.map((c) =>
      c.id === id ? { ...c, type: newType, language: newLang } : c
    );
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleUpdateCellTitle = (id: string, newTitle: string) => {
    const updated = cells.map((c) => (c.id === id ? { ...c, title: newTitle } : c));
    onUpdateCells(updated);
  };

  const handleMoveCellUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...cells];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleMoveCellDown = (index: number) => {
    if (index >= cells.length - 1) return;
    const updated = [...cells];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleDuplicateCell = (index: number) => {
    const target = cells[index];
    if (!target) return;
    const duplicate: TextCell = {
      ...createDefaultCell(target.type, target.language, target.content, `${target.title || 'Cell'} (Copy)`),
    };
    const updated = [...cells.slice(0, index + 1), duplicate, ...cells.slice(index + 1)];
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleDeleteCell = (id: string) => {
    if (cells.length <= 1) return;
    const updated = cells.filter((c) => c.id !== id);
    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
  };

  const handleAddCell = (type: CellType, atIndex?: number) => {
    let lang: SyntaxMode = 'javascript';
    if (type === 'markdown') lang = 'markdown';
    else if (type === 'json') lang = 'json';
    else if (type === 'text') lang = 'plaintext';
    else lang = settings.modeName;

    const newCell = createDefaultCell(type, lang, '');
    let updated: TextCell[];
    if (typeof atIndex === 'number') {
      updated = [...cells.slice(0, atIndex + 1), newCell, ...cells.slice(atIndex + 1)];
    } else {
      updated = [...cells, newCell];
    }

    onUpdateCells(updated);
    onChange(serializeCellsToContent(updated));
    setIsNotebookMode(true);
  };

  return (
    <div className="editor-canvas" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* View-Only Mode Banner */}
      {viewOnly && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            padding: '0.4rem 1rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={13} />
            <span><strong>View-Only Mode:</strong> Editing is locked for this Codeshare session.</span>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Read only</span>
        </div>
      )}

      {/* Workspace Sub-Toolbar: Mode Switcher & + Cell Buttons */}
      <div
        className="workspace-subbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 0.85rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-light)',
          fontSize: '0.775rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className={`btn btn-sm ${!isNotebookMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsNotebookMode(false)}
            title="Single Unified File Editor"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <FileText size={13} />
            <span>Single File</span>
          </button>

          <button
            className={`btn btn-sm ${isNotebookMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsNotebookMode(true)}
            title="Multi-Format Cells Notebook"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Layers size={13} />
            <span>Cells Notebook ({cells.length})</span>
          </button>
        </div>

        {/* Quick Add Cell Bar */}
        {!viewOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.725rem', marginRight: '0.2rem' }}>Add Cell:</span>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleAddCell('code')}
              title="Add Code Cell"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Code2 size={12} color="#3b82f6" />
              <span>+ Code</span>
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleAddCell('markdown')}
              title="Add Markdown Documentation Cell"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <FileText size={12} color="#10b981" />
              <span>+ Markdown</span>
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleAddCell('json')}
              title="Add JSON Cell"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Braces size={12} color="#f59e0b" />
              <span>+ JSON</span>
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleAddCell('text')}
              title="Add Plain Text Notes Cell"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <AlignLeft size={12} color="#8b5cf6" />
              <span>+ Text</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Body: Either Multi-Cell Notebook or Single Editor */}
      <div style={{ flex: 1, height: '100%', overflow: 'auto' }}>
        {isNotebookMode ? (
          <div className="notebook-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            {cells.map((cell, index) => (
              <CellEditor
                key={cell.id}
                cell={cell}
                index={index}
                totalCells={cells.length}
                theme={settings.theme}
                viewOnly={viewOnly}
                onUpdateContent={handleUpdateCellContent}
                onUpdateType={handleUpdateCellType}
                onUpdateTitle={handleUpdateCellTitle}
                onMoveUp={handleMoveCellUp}
                onMoveDown={handleMoveCellDown}
                onDuplicate={handleDuplicateCell}
                onDelete={handleDeleteCell}
                onAddCellBelow={(idx, type) => handleAddCell(type, idx)}
              />
            ))}

            {/* Bottom Add Cell Bar */}
            {!viewOnly && (
              <div
                className="notebook-bottom-add-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1.25rem',
                  border: '1px dashed var(--border-light)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  marginTop: '1rem',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddCell('code')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} color="#3b82f6" />
                  <span>Add Code Cell</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddCell('markdown')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} color="#10b981" />
                  <span>Add Markdown Cell</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddCell('json')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} color="#f59e0b" />
                  <span>Add JSON Cell</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddCell('text')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} color="#8b5cf6" />
                  <span>Add Text Cell</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            theme={settings.theme === 'light' ? 'light' : oneDark}
            extensions={extensions}
            onChange={(val) => {
              if (viewOnly) return;
              onChange(val);
              // Also update cell 0 if single cell exists
              if (cells.length <= 1) {
                onUpdateCells([{ ...cells[0], content: val }]);
              }
            }}
            readOnly={viewOnly}
            editable={!viewOnly}
            placeholder="Write or paste code here then share. Anyone you share with will see code as it is typed!"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              defaultKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
              tabSize: settings.tabSize,
            }}
          />
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="editor-statusbar" style={{ flexShrink: 0 }}>
        <div className="editor-statusbar__group">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileCode size={13} />
            <strong style={{ color: 'var(--text-muted)' }}>
              {isNotebookMode ? `Notebook (${cells.length} cells)` : settings.modeName}
            </strong>
          </span>
          <span>Tab Size: {settings.tabSize}</span>
          <span>Theme: {settings.theme}</span>
        </div>

        <div className="editor-statusbar__group">
          {collaborators.length > 1 && (
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={12} />
              <span>{collaborators.length} active peers</span>
            </span>
          )}
          <span>Lines: {lineCount}</span>
          <span>Length: {charCount}</span>
        </div>
      </div>
    </div>
  );
};
