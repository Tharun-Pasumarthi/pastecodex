/**
 * Generates a 6-character random alphanumeric slug matching Codeshare's observed ID format
 * Example observed IDs: 5NxYxV, GAxoxx, G7WQWo, aVxYx8
 */
export function generateCodeshareId(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Maps syntax mode to standard file extension for download
 */
export function getExtensionForMode(mode: string): string {
  switch (mode) {
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'python':
      return 'py';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'cpp':
      return 'cpp';
    case 'sql':
      return 'sql';
    case 'markdown':
      return 'md';
    default:
      return 'txt';
  }
}
