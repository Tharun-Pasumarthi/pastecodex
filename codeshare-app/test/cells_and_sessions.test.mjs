import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node test runner
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MockLocalStorage();

const {
  getDeviceSavedSessions,
  addDeviceSavedSession,
  removeDeviceSavedSession,
  getAccountSavedSessions,
  saveAccountSessions,
  getAllAccessibleSessions,
} = await import('../src/utils/sessionManager.ts');

const {
  createDefaultCell,
  serializeCellsToContent,
  ensureValidCells,
} = await import('../src/utils/cellUtils.ts');

test('SessionManager: saves and retrieves device-level sessions across logouts', () => {
  globalThis.localStorage.clear();

  assert.deepEqual(getDeviceSavedSessions(), []);

  addDeviceSavedSession('roomA');
  addDeviceSavedSession('roomB');
  assert.deepEqual(getDeviceSavedSessions(), ['roomB', 'roomA']);

  addDeviceSavedSession('roomA'); // Duplicate should move to front
  assert.deepEqual(getDeviceSavedSessions(), ['roomA', 'roomB']);

  removeDeviceSavedSession('roomA');
  assert.deepEqual(getDeviceSavedSessions(), ['roomB']);
});

test('SessionManager: saves and isolates account-level sessions by user email', () => {
  globalThis.localStorage.clear();

  saveAccountSessions('alice@example.com', ['room1', 'room2']);
  saveAccountSessions('bob@example.com', ['room3']);

  assert.deepEqual(getAccountSavedSessions('alice@example.com'), ['room1', 'room2']);
  assert.deepEqual(getAccountSavedSessions('bob@example.com'), ['room3']);
  assert.deepEqual(getAccountSavedSessions('charlie@example.com'), []);
});

test('SessionManager: getAllAccessibleSessions merges device and account sessions without dropping', () => {
  globalThis.localStorage.clear();
  addDeviceSavedSession('guestRoom1');
  saveAccountSessions('dev@example.com', ['accountRoom1']);

  // Logged-in user should see both
  const user = {
    id: 'usr_1',
    name: 'Dev',
    email: 'dev@example.com',
    isAnonymous: false,
    isPro: false,
    savedCodeshares: ['accountRoom1'],
  };

  const accessible = getAllAccessibleSessions(user);
  assert.ok(accessible.includes('guestRoom1'));
  assert.ok(accessible.includes('accountRoom1'));

  // On logout (user becomes anonymous/null), guest should still access device sessions
  const guestAccessible = getAllAccessibleSessions(null);
  assert.ok(guestAccessible.includes('guestRoom1'));
});

test('CellUtils: createDefaultCell and serializeCellsToContent', () => {
  const cell1 = createDefaultCell('code', 'javascript', 'const a = 1;', 'Main Block');
  const cell2 = createDefaultCell('markdown', 'markdown', '# Documentation\nDetails here', 'Notes');

  assert.equal(cell1.type, 'code');
  assert.equal(cell1.language, 'javascript');
  assert.equal(cell1.content, 'const a = 1;');
  assert.equal(cell1.title, 'Main Block');

  const serialized = serializeCellsToContent([cell1, cell2]);
  assert.ok(serialized.includes('const a = 1;'));
  assert.ok(serialized.includes('# Documentation'));
});

test('CellUtils: ensureValidCells handles invalid or empty cell inputs gracefully', () => {
  const recovered = ensureValidCells(null, 'console.log("hello");');
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].content, 'console.log("hello");');

  const validCells = [createDefaultCell('json', 'json', '{"ok": true}')];
  assert.equal(ensureValidCells(validCells), validCells);
});
