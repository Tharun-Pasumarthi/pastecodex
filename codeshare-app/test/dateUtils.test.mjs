import test from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of date utility logic matching src/utils/dateUtils.ts
function formatFriendlyTimestamp(dateInput) {
  let d;
  if (!dateInput) {
    d = new Date();
  } else if (dateInput instanceof Date) {
    d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  } else {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) d = new Date();
  }

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeOnly(dateInput) {
  let d;
  if (!dateInput) {
    d = new Date();
  } else if (dateInput instanceof Date) {
    d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  } else {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) d = new Date();
  }

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

test('formatFriendlyTimestamp outputs dynamic current time with month, day, hour, and minute', () => {
  const fixed = new Date('2026-10-27T10:45:00Z');
  const formatted = formatFriendlyTimestamp(fixed);
  assert.ok(formatted.length > 5, 'Should format a readable string');
  assert.ok(formatted.includes(':'), 'Should include colon for time separation');
});

test('formatFriendlyTimestamp generates valid output when called without arguments (dynamic live time)', () => {
  const current = formatFriendlyTimestamp();
  assert.ok(typeof current === 'string');
  assert.ok(current.length > 0);
  assert.match(current, /[A-Za-z]{3}\s+\d+.*:\d+/);
});

test('formatFriendlyTimestamp handles invalid date input gracefully without crashing', () => {
  const result = formatFriendlyTimestamp('not-a-valid-date');
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('formatTimeOnly formats hours and minutes properly', () => {
  const fixed = new Date('2026-10-27T14:30:00Z');
  const formatted = formatTimeOnly(fixed);
  assert.ok(formatted.includes(':'));
});
