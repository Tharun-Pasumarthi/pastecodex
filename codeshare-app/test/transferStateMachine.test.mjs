import test from 'node:test';
import assert from 'node:assert/strict';

function sanitizeFilename(rawName) {
  if (!rawName) return 'unnamed_file';
  const sanitized = rawName
    .replace(/\0/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\.+/g, '.')
    .trim();
  return sanitized.slice(0, 255) || 'unnamed_file';
}

function isValidTransition(from, to) {
  const transitions = {
    created: ['uploading', 'cancelled', 'failed'],
    uploading: ['verifying', 'paused', 'cancelled', 'failed'],
    verifying: ['available', 'failed', 'cancelled'],
    available: ['downloading', 'expired', 'cancelled'],
    downloading: ['completed', 'failed', 'cancelled'],
    completed: ['downloading'],
    paused: ['uploading', 'cancelled', 'failed'],
    failed: ['uploading', 'cancelled'],
    cancelled: [],
    expired: [],
  };

  return transitions[from]?.includes(to) ?? false;
}

test('sanitizeFilename prevents directory traversal and shell metacharacters', () => {
  assert.equal(sanitizeFilename('../../../etc/passwd'), '._._._etc_passwd');
  assert.equal(sanitizeFilename('file\\name*test?.pdf'), 'file_name_test_.pdf');
  assert.equal(sanitizeFilename(''), 'unnamed_file');
  assert.equal(sanitizeFilename('  normal_document.docx  '), 'normal_document.docx');
});

test('isValidTransition strictly enforces Phase 3 transfer lifecycle', () => {
  // Valid transitions
  assert.ok(isValidTransition('created', 'uploading'));
  assert.ok(isValidTransition('uploading', 'verifying'));
  assert.ok(isValidTransition('verifying', 'available'));
  assert.ok(isValidTransition('available', 'downloading'));
  assert.ok(isValidTransition('downloading', 'completed'));
  assert.ok(isValidTransition('uploading', 'paused'));
  assert.ok(isValidTransition('paused', 'uploading'));

  // Illegal transitions
  assert.equal(isValidTransition('created', 'available'), false);
  assert.equal(isValidTransition('created', 'completed'), false);
  assert.equal(isValidTransition('cancelled', 'uploading'), false);
  assert.equal(isValidTransition('expired', 'downloading'), false);
});

test('Chunk partitioning correctly computes slice count and boundaries', () => {
  const totalBytes = 1000 * 1024; // 1 MB
  const chunkSize = 450 * 1024; // 450 KB
  const totalChunks = Math.ceil(totalBytes / chunkSize);
  assert.equal(totalChunks, 3);

  const chunk0Start = 0 * chunkSize;
  const chunk0End = Math.min(chunk0Start + chunkSize, totalBytes);
  assert.equal(chunk0End - chunk0Start, 450 * 1024);

  const chunk2Start = 2 * chunkSize;
  const chunk2End = Math.min(chunk2Start + chunkSize, totalBytes);
  assert.equal(chunk2End - chunk2Start, 100 * 1024); // Remainder
});
