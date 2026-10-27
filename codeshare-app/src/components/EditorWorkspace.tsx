import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import type { EditorSettings, Collaborator } from '../types';
import { getLanguageExtension } from '../utils/languages';
import { Lock, FileCode, CheckCircle2 } from 'lucide-react';

interface EditorWorkspaceProps {
  content: string;
  onChange: (val: string) => void;
  settings: EditorSettings;
  viewOnly: boolean;
  collaborators: Collaborator[];
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  content,
  onChange,
  settings,
  viewOnly,
  collaborators,
}) => {
  const extensions = useMemo(() => {
    return getLanguageExtension(settings.modeName);
  }, [settings.modeName]);

  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  const charCount = content.length;

  return (
    <div className="editor-canvas">
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

      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        <CodeMirror
          value={content}
          height="100%"
          theme={settings.theme === 'light' ? 'light' : oneDark}
          extensions={extensions}
          onChange={(val) => {
            if (viewOnly) return;
            onChange(val);
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
      </div>

      <div className="editor-statusbar">
        <div className="editor-statusbar__group">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileCode size={13} />
            <strong style={{ color: 'var(--text-muted)' }}>{settings.modeName}</strong>
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
