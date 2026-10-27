export type SyntaxMode =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'cpp'
  | 'sql'
  | 'markdown'
  | 'plaintext';

export type EditorTheme = 'monokai' | 'one-dark' | 'dracula' | 'light';

export type KeymapMode = 'default' | 'sublime' | 'vim' | 'emacs';

export type ActiveTab = 'code' | 'pdf' | 'image' | string;

export type ExpirationOption = 'never' | '1h' | '24h' | '7d' | '30d';

export interface EditorSettings {
  modeName: SyntaxMode;
  tabSize: 2 | 4 | 6 | 8;
  theme: EditorTheme;
  keymap: KeymapMode;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    ch: number;
  };
  isMe?: boolean;
}

export interface AttachedMedia {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  mimeType: string;
  size: number;
  dataUrl: string; // Base64 data URL
  isEncrypted: boolean;
  iv?: string;
  uploadedAt: string;
}

export type CellType = 'code' | 'markdown' | 'json' | 'text';

export interface TextCell {
  id: string;
  type: CellType;
  language: SyntaxMode;
  content: string;
  title?: string;
  collapsed?: boolean;
}

export interface CodeshareDocument {
  id: string;
  title: string;
  content: string;
  cells?: TextCell[];
  createdAt: string;
  expiresAt: string;
  viewOnly: boolean;
  settings: EditorSettings;
  collaborators: Collaborator[];
  activeTab: ActiveTab;
  attachedMedia?: AttachedMedia | null;
  attachedMediaList?: AttachedMedia[];
  encryptionKey?: string;
  isEncrypted?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
  isPro: boolean;
  savedCodeshares: string[];
}
