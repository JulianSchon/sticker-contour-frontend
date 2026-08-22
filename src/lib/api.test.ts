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

  it('fetchTemplate appends widthMm/heightMm when a size is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchTemplate('olburk', { widthMm: 204, heightMm: 110 });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/templates\/olburk\?widthMm=204&heightMm=110$/);
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
    expect((opts.body as FormData).get('widthMm')).toBeNull();
  });

  it('generateTemplatePdfBlob includes widthMm/heightMm when a size is given', async () => {
    const blob = new Blob(['%PDF-']);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal('fetch', fetchMock);
    await generateTemplatePdfBlob(new Blob(['x']), 'vinflaska', '#000000', { widthMm: 100, heightMm: 150 });
    const fd = fetchMock.mock.calls[0][1].body as FormData;
    expect(fd.get('templateId')).toBe('vinflaska');
    expect(fd.get('widthMm')).toBe('100');
    expect(fd.get('heightMm')).toBe('150');
  });
});
