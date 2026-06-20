import type { ClipartItem, Template, ContentLibrary } from '../types/content.ts';
import { BUNDLED_TEMPLATES, BUNDLED_CLIPART } from './bundledContent.ts';

function isStr(v: unknown): v is string { return typeof v === 'string'; }

export function parseClipart(data: unknown): ClipartItem[] {
  if (!Array.isArray(data)) return [];
  const out: ClipartItem[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (!isStr(o.id) || !isStr(o.name) || !isStr(o.url)) continue;
    const tags = Array.isArray(o.tags) ? o.tags.filter(isStr) : [];
    out.push({ id: o.id, name: o.name, url: o.url, tags });
  }
  return out;
}

export function parseTemplates(data: unknown): Template[] {
  if (!Array.isArray(data)) return [];
  const out: Template[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (!isStr(o.id) || !isStr(o.name) || !Array.isArray(o.elements) || o.elements.length === 0) continue;
    out.push({
      id: o.id, name: o.name,
      category: isStr(o.category) ? o.category : 'Other',
      elements: o.elements as Template['elements'],
    });
  }
  return out;
}

/** Load the content library. With a REST base, fetch /templates and /clipart
 *  and validate; otherwise (or on any error/empty) use the bundled set. */
export async function loadContentLibrary(restBase?: string): Promise<ContentLibrary> {
  if (!restBase) return { templates: BUNDLED_TEMPLATES, clipart: BUNDLED_CLIPART };
  const base = restBase.replace(/\/$/, '');
  try {
    const [tplRes, clipRes] = await Promise.all([
      fetch(`${base}/templates`),
      fetch(`${base}/clipart`),
    ]);
    const templates = parseTemplates(tplRes.ok ? await tplRes.json() : null);
    const clipart = parseClipart(clipRes.ok ? await clipRes.json() : null);
    return {
      templates: templates.length ? templates : BUNDLED_TEMPLATES,
      clipart: clipart.length ? clipart : BUNDLED_CLIPART,
    };
  } catch {
    return { templates: BUNDLED_TEMPLATES, clipart: BUNDLED_CLIPART };
  }
}
