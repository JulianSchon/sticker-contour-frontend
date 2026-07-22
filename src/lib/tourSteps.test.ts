import { describe, it, expect } from 'vitest';
import { buildTourSteps, filterStepsInDom } from './tourSteps';

describe('buildTourSteps', () => {
  it('upload flow includes shape and size', () => {
    const anchors = buildTourSteps('upload').map(s => s.anchor);
    expect(anchors).toEqual(['preview', 'shape', 'size', 'offset', 'finish', 'save']);
  });

  it('contour (single) flow excludes shape and size', () => {
    const anchors = buildTourSteps('single').map(s => s.anchor);
    expect(anchors).toEqual(['preview', 'offset', 'finish', 'save']);
  });

  it('sheet flow also excludes shape and size', () => {
    const anchors = buildTourSteps('sheet').map(s => s.anchor);
    expect(anchors).toEqual(['preview', 'offset', 'finish', 'save']);
  });
});

describe('filterStepsInDom', () => {
  it('keeps only steps whose [data-tour] anchor exists in the document', () => {
    document.body.innerHTML = '<div data-tour="preview"></div><div data-tour="save"></div>';
    const steps = buildTourSteps('upload');
    const kept = filterStepsInDom(steps, document).map(s => s.anchor);
    expect(kept).toEqual(['preview', 'save']);
  });
});
