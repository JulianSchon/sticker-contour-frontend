import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isTourDone, markTourDone } from './tourStorage';

describe('tourStorage', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('is not done initially', () => {
    expect(isTourDone()).toBe(false);
  });

  it('is done after markTourDone', () => {
    markTourDone();
    expect(isTourDone()).toBe(true);
  });

  it('does not throw when localStorage.getItem throws (returns false)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => isTourDone()).not.toThrow();
    expect(isTourDone()).toBe(false);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => markTourDone()).not.toThrow();
  });
});
