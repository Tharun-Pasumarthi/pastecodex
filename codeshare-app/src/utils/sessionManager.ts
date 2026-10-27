/**
 * PasteCodex Persistent Session Manager
 * Ensures saved codeshare sessions are never dropped upon logout.
 * Retains sessions per user account and across the device library.
 */

import type { User } from '../types';

const DEVICE_SESSIONS_KEY = 'codeshare_device_saved_sessions';
const ACCOUNT_PREFIX = 'codeshare_account_sessions_';

/**
 * Normalizes email for storage key
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Returns list of session IDs saved on this local device/browser.
 */
export function getDeviceSavedSessions(): string[] {
  try {
    const raw = localStorage.getItem(DEVICE_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * Adds a session ID to the device-level permanent library.
 */
export function addDeviceSavedSession(id: string): void {
  if (!id) return;
  try {
    const existing = getDeviceSavedSessions();
    const updated = [id, ...existing.filter((item) => item !== id)];
    localStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Removes a session ID from the device-level library.
 */
export function removeDeviceSavedSession(id: string): void {
  try {
    const existing = getDeviceSavedSessions();
    const updated = existing.filter((item) => item !== id);
    localStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Retrieves saved session IDs for a specific user account email.
 */
export function getAccountSavedSessions(email: string): string[] {
  if (!email) return [];
  try {
    const key = `${ACCOUNT_PREFIX}${normalizeEmail(email)}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Saves a list of session IDs to an account-specific storage bucket.
 */
export function saveAccountSessions(email: string, sessions: string[]): void {
  if (!email) return;
  try {
    const key = `${ACCOUNT_PREFIX}${normalizeEmail(email)}`;
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(sessions))));
  } catch {
    // ignore
  }
}

/**
 * Aggregates all accessible saved session IDs for the active user context.
 * Guarantees that logging out never drops or clears the user's saved sessions.
 */
export function getAllAccessibleSessions(currentUser: User | null): string[] {
  const deviceSessions = getDeviceSavedSessions();
  const userSessions = currentUser?.savedCodeshares || [];
  const accountSessions = currentUser?.email ? getAccountSavedSessions(currentUser.email) : [];

  // Deduplicate and maintain most-recent order
  const combined = Array.from(new Set([...userSessions, ...accountSessions, ...deviceSessions]));
  return combined;
}
