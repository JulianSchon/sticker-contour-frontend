import { describe, it, expect } from 'vitest';
import { parseTemplates, parseClipart } from './contentSource.ts';

describe('parseClipart', () => {
  it('keeps valid items and drops malformed ones', () => {
    const out = parseClipart([
      { id: 'a', name: 'A', tags: ['x'], url: '/a.svg' },
      { id: 'b', url: 123 },
      { name: 'no id' },
      'nonsense',
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });
  it('returns [] for non-arrays', () => {
    expect(parseClipart(null)).toEqual([]);
    expect(parseClipart({})).toEqual([]);
  });
});

describe('parseTemplates', () => {
  it('keeps templates with a valid elements array', () => {
    const out = parseTemplates([
      { id: 't1', name: 'T1', category: 'C', elements: [{ kind: 'text', text: 'Hi', xPct: 50, yPct: 50, fontPct: 10, fill: '#000', fontFamily: 'Poppins' }] },
      { id: 't2', name: 'no elements' },
    ]);
    expect(out.map(t => t.id)).toEqual(['t1']);
  });
});
