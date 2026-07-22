const KEY = 'cutz-tour-done';

/** True if the user has already skipped or finished the tour. Safe if storage is blocked. */
export function isTourDone(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that the tour was skipped or finished. No-op if storage is blocked. */
export function markTourDone(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* ignore — private mode / disabled storage */
  }
}
