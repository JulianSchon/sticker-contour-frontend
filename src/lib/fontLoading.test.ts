import { describe, it, expect, vi } from 'vitest';
import { ensureFontsLoaded } from './fontLoading.ts';

describe('ensureFontsLoaded', () => {
  it('resolves after loading each requested family', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const ready = Promise.resolve();
    const fakeFonts = { load, ready } as unknown as FontFaceSet;

    await ensureFontsLoaded(['Poppins', 'Pacifico'], 48, fakeFonts);

    expect(load).toHaveBeenCalledWith('48px "Poppins"');
    expect(load).toHaveBeenCalledWith('48px "Pacifico"');
  });

  it('resolves even if a font fails to load (never blocks export)', async () => {
    const load = vi.fn().mockRejectedValue(new Error('network'));
    const fakeFonts = { load, ready: Promise.resolve() } as unknown as FontFaceSet;
    await expect(ensureFontsLoaded(['Broken'], 24, fakeFonts)).resolves.toBeUndefined();
  });
});
