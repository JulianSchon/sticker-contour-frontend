import type { translations } from './i18n.ts';

export type Flow = 'single' | 'sheet' | 'upload';
type TKey = keyof typeof translations['en'];

export interface TourStep {
  anchor: string;   // matches a data-tour="<anchor>" attribute
  titleKey: TKey;
  bodyKey: TKey;
}

// Ordered superset. `flows` restricts a step to specific flows; absent = all flows.
const ALL: (TourStep & { flows?: Flow[] })[] = [
  { anchor: 'preview', titleKey: 'tourPreviewTitle', bodyKey: 'tourPreviewBody' },
  { anchor: 'shape',   titleKey: 'tourShapeTitle',   bodyKey: 'tourShapeBody',   flows: ['upload'] },
  { anchor: 'size',    titleKey: 'tourSizeTitle',    bodyKey: 'tourSizeBody',    flows: ['upload'] },
  { anchor: 'offset',  titleKey: 'tourOffsetTitle',  bodyKey: 'tourOffsetBody' },
  { anchor: 'finish',  titleKey: 'tourFinishTitle',  bodyKey: 'tourFinishBody' },
  { anchor: 'save',    titleKey: 'tourSaveTitle',    bodyKey: 'tourSaveBody' },
];

/** Ordered steps for a flow (before DOM-presence filtering). */
export function buildTourSteps(flow: Flow): TourStep[] {
  return ALL
    .filter(s => !s.flows || s.flows.includes(flow))
    .map(({ flows: _flows, ...step }) => step);
}

/** Drop steps whose anchor element is not present in the document. */
export function filterStepsInDom(steps: TourStep[], doc: Document = document): TourStep[] {
  return steps.filter(s => doc.querySelector(`[data-tour="${s.anchor}"]`) != null);
}
