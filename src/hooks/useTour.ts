import { useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { buildTourSteps, filterStepsInDom, type Flow } from '../lib/tourSteps.ts';
import { isTourDone, markTourDone } from '../lib/tourStorage.ts';
import { translations, type Lang } from '../lib/i18n.ts';

/**
 * Coach-mark tour of the cut page. `autoStartOnce` respects the done-flag and the
 * presence of anchors; `start` always runs (replay). Only steps whose data-tour
 * anchor is currently in the DOM are shown, so the tour adapts to the active flow.
 */
export function useTour(flow: Flow, lang: Lang) {
  const t = translations[lang];

  const run = useCallback(() => {
    const steps = filterStepsInDom(buildTourSteps(flow));
    if (steps.length === 0) return;
    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: 'rgba(0,0,0,0.7)',
      nextBtnText: t.tourNext,
      prevBtnText: t.tourPrev,
      doneBtnText: t.tourDone,
      steps: steps.map(s => ({
        element: `[data-tour="${s.anchor}"]`,
        popover: { title: t[s.titleKey], description: t[s.bodyKey] },
      })),
      // Fires on finish, Skip (X), and overlay click — mark done in every case.
      onDestroyed: () => { markTourDone(); },
    });
    d.drive();
  }, [flow, t]);

  const autoStartOnce = useCallback(() => {
    if (!isTourDone()) run();
  }, [run]);

  return { autoStartOnce, start: run };
}
