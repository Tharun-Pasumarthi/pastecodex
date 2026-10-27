import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { cpp } from '@codemirror/lang-cpp';
import type { SyntaxMode } from '../types';
import type { Extension } from '@codemirror/state';

export function getLanguageExtension(mode: SyntaxMode): Extension[] {
  switch (mode) {
    case 'javascript':
      return [javascript({ jsx: true })];
    case 'typescript':
      return [javascript({ jsx: true, typescript: true })];
    case 'python':
      return [python()];
    case 'html':
      return [html()];
    case 'css':
      return [css()];
    case 'json':
      return [json()];
    case 'cpp':
      return [cpp()];
    default:
      return [];
  }
}

export const SYNTAX_OPTIONS: { label: string; value: SyntaxMode }[] = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'C++', value: 'cpp' },
  { label: 'SQL', value: 'sql' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Plain Text', value: 'plaintext' },
];
