import { describe, expect, it } from 'vitest';
import { MemoryStore, SaveSystem } from '../src/core/save';

describe('SaveSystem', () => {
  it('round-trips run and meta separately', () => {
    const s = new SaveSystem(new MemoryStore());
    s.saveRun({ a: 1 });
    s.saveMeta({ b: 2 });
    expect(s.loadRun()).toEqual({ a: 1 });
    expect(s.loadMeta()).toEqual({ b: 2 });
    s.clearRun();
    expect(s.loadRun()).toBeNull();
    expect(s.loadMeta()).toEqual({ b: 2 });
  });

  it('ignores corrupt or future saves', () => {
    const store = new MemoryStore();
    const s = new SaveSystem(store);
    store.setItem('packbound.run', '{not json');
    expect(s.loadRun()).toBeNull();
    store.setItem('packbound.run', JSON.stringify({ version: 999, savedAt: 0, data: {} }));
    expect(s.loadRun()).toBeNull();
  });
});
