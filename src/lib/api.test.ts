import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTemplate, generateTemplatePdfBlob } from './api';

afterEach(() => vi.restoreAllMocks());

describe('template api', () => {
  it('fetchTemplate GETs /templates/:id and returns json', async () => {
    const tpl = { id: 'peltor', name: 'Peltor', widthMm: 1, heightMm: 1, sheetCutPath: '', sheetBBoxMm: { x:0,y:0,w:1,h:1 }, shields: [] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => tpl });
    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchTemplate('peltor');
    expect(out).toEqual(tpl);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/templates\/peltor$/);
  });

  it('fetchTemplate throws on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchTemplate('nope')).rejects.toThrow();
  });

  it('generateTemplatePdfBlob POSTs multipart to /template-generate', async () => {
    const blob = new Blob(['%PDF-']);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal('fetch', fetchMock);
    const out = await generateTemplatePdfBlob(new Blob(['x']), 'peltor', '#f3e627');
    expect(out).toBe(blob);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/template-generate$/);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
  });
});
