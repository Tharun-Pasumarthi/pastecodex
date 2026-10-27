/**
 * Utilities for Multi-Format Text Cells (Notebook Mode)
 * Supports Code, Markdown, JSON, and Plain Text cells.
 */

import type { TextCell, CellType, SyntaxMode } from '../types';

export function generateCellId(): string {
  return 'cell_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

export function createDefaultCell(
  type: CellType = 'code',
  language: SyntaxMode = 'javascript',
  initialContent: string = '',
  title?: string
): TextCell {
  return {
    id: generateCellId(),
    type,
    language,
    content: initialContent,
    title: title || (type === 'markdown' ? 'Documentation' : type === 'json' ? 'JSON Data' : 'Code Block'),
    collapsed: false,
  };
}

/**
 * Combines all cell contents into a unified text document for export or single-file view.
 */
export function serializeCellsToContent(cells: TextCell[]): string {
  if (!cells || cells.length === 0) return '';
  if (cells.length === 1) return cells[0].content;

  return cells
    .map((c, i) => {
      const header = `/* --- [Cell ${i + 1}: ${c.title || c.type.toUpperCase()}] (${c.language}) --- */`;
      return `${header}\n${c.content}`;
    })
    .join('\n\n');
}

/**
 * Ensures a valid array of cells exists for a document.
 */
export function ensureValidCells(
  existingCells?: TextCell[],
  fallbackContent: string = '',
  defaultLanguage: SyntaxMode = 'javascript'
): TextCell[] {
  if (existingCells && existingCells.length > 0) {
    return existingCells;
  }
  return [createDefaultCell('code', defaultLanguage, fallbackContent, 'Main Code')];
}
