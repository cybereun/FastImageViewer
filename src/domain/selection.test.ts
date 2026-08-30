import { describe, expect, it } from 'vitest';
import { selectAll, selectRange, toggleSelection } from './selection';

const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

describe('selection domain rules', () => {
  it('toggles additive and replaces non-additive selection', () => {
    expect([...toggleSelection(new Set(), 'a', false)]).toEqual(['a']);
    expect([...toggleSelection(new Set(['a']), 'b', true)]).toEqual(['a', 'b']);
    expect([...toggleSelection(new Set(['a', 'b']), 'a', true)]).toEqual(['b']);
  });

  it('selects a range in either direction', () => {
    expect([...selectRange(items, 'b', 'd')]).toEqual(['b', 'c', 'd']);
    expect([...selectRange(items, 'd', 'b')]).toEqual(['b', 'c', 'd']);
  });

  it('selects all visible items', () => {
    expect(selectAll(items)).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(selectAll([])).toEqual(new Set());
  });
});
