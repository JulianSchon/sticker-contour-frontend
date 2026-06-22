import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ParameterPanel } from './components/ParameterPanel.tsx';
import { CanvasPreview } from './components/CanvasPreview.tsx';
import { MockupCarousel } from './components/MockupCarousel.tsx';
import { DownloadButton } from './components/DownloadButton.tsx';
import { PrintPlanningTab } from './components/PrintPlanning/PrintPlanningTab.tsx';
import { WordpressPrintPlanningTab } from './components/PrintPlanning/WordpressPrintPlanningTab.tsx';
import { DesignEditor, type DesignEditorHandle } from './components/Editor/DesignEditor.tsx';
import { useContour } from './hooks/useContour.ts';
import type { ContourParams } from './types/contour.ts';
import { LangContext, type Theme } from './lib/LangContext.ts';
import { translations, type Lang } from './lib/i18n.ts';
import { MaterialFinishPicker, type Material, type Finish } from './components/MaterialFinishPicker.tsx';
import type { PlannedFile } from './types/printPlanning.ts';
import { buildSheetItem, SHEET_COLORS } from './lib/sheetItem.ts';

const DEFAULT_PARAMS: ContourParams = {
  threshold: 128,
  kissOffset: 0,
  perfOffset: 2,
  smoothing: 4,
  enclose: true,
  cutMode: 'perf',
  shapeType: 'contour',
  shapeSize: 90,
  shapeOffsetX: 0,
  shapeOffsetY: 0,
};

type Tab = 'design' | 'contour' | 'print-planning';
type WpMode = null | 'single' | 'sheet' | 'design';

const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

export default function App() {
  const [tab, setTab] = useState<Tab>('design');
  const [wpMode, setWpMode] = useState<WpMode>('design');
  const [file, setFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [params, setParams] = useState<ContourParams>(DEFAULT_PARAMS);
  const [stickerWidthCm, setStickerWidthCm] = useState<number | null>(null);
  const [stickerHeightCm, setStickerHeightCm] = useState<number | null>(null);
  const [material, setMaterial] = useState<Material>('laminerad');
  const [finish, setFinish] = useState<Finish>('glossy');
  const [sheetItems, setSheetItems] = useState<PlannedFile[]>([]);
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [showSheetPrompt, setShowSheetPrompt] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('sv');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('cutz-theme') : null;
    return saved === 'light' ? 'light' : 'dark';
  });
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('cutz-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const { data: contour, isLoading, error } = useContour(file, params);

  // Editor hands its flattened design off to the cut dialog for cut refinement.
  const handleDesignComplete = (f: File, dataUrl: string, widthCm: number, heightCm: number) => {
    setFile(f);
    setImageDataUrl(dataUrl);
    setStickerWidthCm(widthCm);
    setStickerHeightCm(heightCm);
    if (IS_WORDPRESS) setWpMode('single');
    else setTab('contour');
  };

  const designRef = useRef<DesignEditorHandle>(null);

  const goToDesign = () => { if (IS_WORDPRESS) setWpMode('design'); else setTab('design'); };

  // Entering the cut view (via the tab/button, not just "Continue") should also
  // flatten the current design so the cut generator shows the latest version.
  const goToCut = async () => {
    const result = await designRef.current?.flatten();
    if (result) handleDesignComplete(result.file, result.dataUrl, result.widthCm, result.heightCm);
    else if (IS_WORDPRESS) setWpMode('single'); else setTab('contour');
  };

  const handleSendToSheet = async () => {
    if (!file || !stickerWidthCm || !stickerHeightCm || sendingToSheet) return;
    setSendingToSheet(true);
    setSheetError(null);
    try {
      const item = await buildSheetItem(file, params, stickerWidthCm, stickerHeightCm, sheetItems.length);
      // Derive the color tag from the authoritative previous state so rapid
      // adds always get a distinct, correctly-cycled color.
      setSheetItems(prev => [
        ...prev,
        { ...item, color: SHEET_COLORS[prev.length % SHEET_COLORS.length] },
      ]);
      setShowSheetPrompt(true);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Failed to add to sheet');
    } finally {
      setSendingToSheet(false);
    }
  };

  // "Add another design" — reset the artboard and cut-step state for a fresh design.
  const handleAddAnother = () => {
    setShowSheetPrompt(false);
    designRef.current?.clear();
    setFile(null);
    setImageDataUrl(null);
    setStickerWidthCm(null);
    setStickerHeightCm(null);
    goToDesign();
  };

  // ── Header tagline ──────────────────────────────────────────────────────────
  const headerTagline = IS_WORDPRESS
    ? (wpMode === 'single' ? t.taglineContour : wpMode === 'sheet' ? t.taglinePrint : wpMode === 'design' ? t.modeDesign : 'CUTZ')
    : (tab === 'print-planning' ? t.taglinePrint : tab === 'contour' ? t.taglineContour : t.modeDesign);

  // Shared preview column for the cut dialog.
  const previewColumn = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="nim-label">{t.livePreview}</p>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-nim-yellow/70">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            {t.detectingContour}
          </span>
        )}
      </div>
      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span><strong>{t.detectionFailed}:</strong> {error.message}</span>
        </div>
      )}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10" style={{ minHeight: '500px' }}>
        <CanvasPreview imageDataUrl={imageDataUrl} contour={contour ?? null} params={params} isLoading={isLoading} finish={finish} />
      </div>
      <MockupCarousel imageDataUrl={imageDataUrl} contour={contour ?? null} params={params} finish={finish} />
    </div>
  );

  // The cut dialog: cut-parameter refinement (+ material/finish in WP) and download.
  // Upload, size and shape are handled upstream in the Design window.
  const cutDialog = !file ? (
    <CutEmptyState
      title={t.cutEmptyTitle}
      hint={t.cutEmptyHint}
      cta={t.cutGoToDesign}
      onGoToDesign={goToDesign}
    />
  ) : (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={goToDesign}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.cutEditDesign}
        </button>
        {stickerWidthCm && stickerHeightCm && (
          <div className="flex items-center gap-2 rounded-xl bg-nim-yellow/10 border border-nim-yellow/30 px-3 py-1.5">
            <svg className="w-4 h-4 text-nim-yellow flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l4-4 14 14-4 4L3 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7l2 2M11 10l2 2M14 13l2 2" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-nim-yellow/70">{t.edSize}</span>
            <span className="text-sm font-black text-white tabular-nums">{stickerWidthCm} × {stickerHeightCm} cm</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] lg:gap-x-6 lg:gap-y-4 lg:items-start">
        {/* Cut params (01) + material & finish (02) */}
        <div className="order-1 lg:col-start-1 lg:row-start-1 flex flex-col gap-4">
          <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              {/* Desktop: full "Adjust parameters". Mobile: only the offset shows,
                  so the title becomes the offset name + its value. */}
              <div className="hidden sm:block"><StepLabel n="01" label={t.step02} /></div>
              <div className="sm:hidden">
                <StepLabel
                  n="01"
                  label={t.perfCutOffset}
                  right={<span className="text-xs font-bold text-nim-yellow tabular-nums">{params.perfOffset} mm</span>}
                />
              </div>
            </div>
            <div className="px-5 pb-5">
              {/* Cut mode hidden for now — perf-cut only (DEFAULT_PARAMS.cutMode='perf').
                  Remove hideCutMode to bring kiss/perf/both back. */}
              <ParameterPanel params={params} onChange={setParams} hideCutMode />
            </div>
          </div>
          {IS_WORDPRESS && (
            <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
              {/* Only Finish is shown (single material), so the title is "Finish". */}
              <div className="px-5 pt-5 pb-2"><StepLabel n="02" label={t.finish} /></div>
              <div className="px-5 pb-5">
                <MaterialFinishPicker
                  material={material} finish={finish}
                  onMaterialChange={setMaterial} onFinishChange={setFinish}
                  hideMaterialOnMobile
                />
              </div>
            </div>
          )}
        </div>

        {/* Live preview / canvas */}
        <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {previewColumn}
        </div>

        {/* Save design / Send to sheet (03) — below the canvas on mobile, under
            the controls on desktop. */}
        <div className="order-3 lg:col-start-1 lg:row-start-2 bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2"><StepLabel n={IS_WORDPRESS ? '03' : '02'} label={IS_WORDPRESS ? t.step03wp : t.step03} /></div>
          <div className="px-5 pb-5 flex flex-col gap-3">
            {IS_WORDPRESS
              ? <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} material={material} finish={finish} />
              : <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />}
            {IS_WORDPRESS && (
              <>
                <button
                  onClick={handleSendToSheet}
                  disabled={!file || sendingToSheet}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed border-nim-yellow/60 text-nim-yellow hover:bg-nim-yellow/10"
                >
                  {sendingToSheet ? t.edPreparing : `+ ${t.sendToSheet}`}
                </button>
                {sheetError && (
                  <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{sheetError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const designActive = IS_WORDPRESS ? wpMode === 'design' : tab === 'design';

  return (
    <LangContext.Provider value={{ lang, t, setLang, theme, setTheme }}>
    <div className="min-h-screen bg-nim-black flex flex-col">

      {/* ── "Sent to sheet" prompt — add another design or go to the sheet? ── */}
      {IS_WORDPRESS && showSheetPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSheetPrompt(false)}
        >
          <div
            className="w-full max-w-md bg-nim-darker border border-nim-yellow/30 rounded-2xl p-7 shadow-2xl flex flex-col items-center text-center gap-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-base font-black text-white uppercase tracking-wider">{t.sentToSheet}</p>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{t.sheetPromptQuestion}</p>
            </div>
            <div className="flex flex-col w-full gap-2.5 mt-1">
              <button
                onClick={handleAddAnother}
                className="w-full px-5 py-3 rounded-lg border-2 border-nim-yellow/60 text-nim-yellow hover:bg-nim-yellow/10 font-bold text-sm uppercase tracking-wide transition-all"
              >
                + {t.sheetAddAnother}
              </button>
              <button
                onClick={() => { setShowSheetPrompt(false); setWpMode('sheet'); }}
                className="nim-btn-yellow w-full"
              >
                {t.sheetGoToSheet}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-nim-darker border-b-2 border-nim-yellow/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3 sm:gap-6 flex-wrap">

          {/* Logo + back button (WP mode with a chosen mode) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {IS_WORDPRESS && wpMode !== null && (
              <button
                onClick={() => setWpMode(null)}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {/* Branding — redundant inside the WordPress page on mobile (the WP
                site shows its own logo), so hide it there to reclaim space. */}
            <div className={`items-center gap-3 sm:gap-4 ${IS_WORDPRESS ? 'hidden sm:flex' : 'flex'}`}>
              <img
                src="/nimstick-logo.png"
                alt="Nimstick"
                className="h-10 w-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="h-6 w-px bg-white/10" />
              <div>
                <p className="text-white font-bold text-sm tracking-widest uppercase leading-none">CUTZ</p>
                <p className="hidden sm:block text-white/30 text-xs tracking-wider mt-0.5">{headerTagline}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {IS_WORDPRESS && sheetItems.length > 0 && (
              <button
                onClick={() => setWpMode('sheet')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nim-yellow/15 border border-nim-yellow/40 text-xs font-bold uppercase tracking-widest text-nim-yellow hover:bg-nim-yellow/25 transition-all"
              >
                {t.arkBadge}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-nim-yellow text-nim-black text-[10px] font-black">
                  {sheetItems.length}
                </span>
              </button>
            )}
            {/* Tab switcher — non-WP only. Design first + default. */}
            {!IS_WORDPRESS && (
              <nav className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                {([
                  { id: 'design',         label: t.tabDesign  },
                  { id: 'contour',        label: t.tabContour },
                  { id: 'print-planning', label: t.tabPrint   },
                ] as { id: Tab; label: string }[]).map(tb => (
                  <button
                    key={tb.id}
                    onClick={() => tb.id === 'contour' ? void goToCut() : setTab(tb.id)}
                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                      tab === tb.id
                        ? 'bg-nim-yellow text-nim-black shadow'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </nav>
            )}

            {/* Mode indicator — WP with active mode */}
            {IS_WORDPRESS && wpMode !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nim-yellow/10 border border-nim-yellow/30">
                <span className="text-xs font-bold uppercase tracking-widest text-nim-yellow">
                  {wpMode === 'single' ? t.modeSingle : wpMode === 'sheet' ? t.modeSheet : t.modeDesign}
                </span>
              </div>
            )}

            {/* Theme toggle — Luke (light side) vs Vader (dark side) */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to the light side (Luke)' : 'Switch to the dark side (Vader)'}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-lg border border-white/10 hover:border-white/30 transition-all flex items-center justify-center overflow-hidden"
            >
              <img
                src={theme === 'dark' ? '/luke-skywalker.svg' : '/darth-vader.svg'}
                alt={theme === 'dark' ? 'Luke Skywalker' : 'Darth Vader'}
                className="h-7 w-auto"
              />
            </button>

            {/* Language toggle — far right */}
            <button
              onClick={() => setLang(lang === 'en' ? 'sv' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white/40 hover:text-white/70 hover:border-white/20 transition-all uppercase tracking-widest"
            >
              {lang === 'en' ? 'SV' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">

        {/* Design editor — always mounted (hidden when inactive) so the design
            persists when you go to the cut dialog and back to keep editing. */}
        <div className={designActive ? '' : 'hidden'}>
          <DesignEditor ref={designRef} onComplete={handleDesignComplete} />
        </div>

        {/* ── WordPress: mode selection landing (reached via back arrow) ── */}
        {IS_WORDPRESS && wpMode === null && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">{t.modeSelectTitle}</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
              {/* Design your own */}
              <button
                onClick={() => setWpMode('design')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-nim-yellow hover:bg-nim-yellow/5 transition-all text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-nim-yellow/10 border border-nim-yellow/20 flex items-center justify-center group-hover:bg-nim-yellow/20 transition-colors">
                  <svg className="w-8 h-8 text-nim-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="w-full">
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-nim-yellow transition-colors">{t.modeDesign}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeDesignDesc}</p>
                </div>
                <div className="w-full flex justify-end">
                  <svg className="w-5 h-5 text-white/20 group-hover:text-nim-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Kiss cut sheet */}
              <button
                onClick={() => setWpMode('sheet')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-pink-400 hover:bg-pink-500/5 transition-all text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <div className="w-full">
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-pink-400 transition-colors">{t.modeSheet}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeSheetDesc}</p>
                </div>
                <div className="w-full flex justify-end">
                  <svg className="w-5 h-5 text-white/20 group-hover:text-pink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── WordPress: cut dialog (post-design) ── */}
        {IS_WORDPRESS && wpMode === 'single' && cutDialog}

        {/* ── WordPress: sheet mode ── */}
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab
            items={sheetItems}
            onItemsChange={setSheetItems}
            onGoToDesign={goToDesign}
          />
        )}

        {/* ── Non-WordPress: tabs (design editor is the always-mounted block above) ── */}
        {!IS_WORDPRESS && tab === 'contour' && cutDialog}

        {!IS_WORDPRESS && tab === 'print-planning' && <PrintPlanningTab />}

      </main>

      {/* ── Footer — hidden in wordpress mode ── */}
      {!IS_WORDPRESS && (
        <footer className="border-t border-white/5 px-6 py-4 flex items-center justify-between text-xs text-white/20">
          <span>{t.footerLabel}</span>
          <a href="https://nimstick.se" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">
            nimstick.se ↗
          </a>
        </footer>
      )}
    </div>
    </LangContext.Provider>
  );
}

function StepLabel({ n, label, right }: { n: string; label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-5 h-5 rounded-md bg-nim-yellow flex items-center justify-center text-nim-black text-xs font-black leading-none shrink-0">
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{label}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

function CutEmptyState({ title, hint, cta, onGoToDesign }: { title: string; hint: string; cta: string; onGoToDesign: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <svg className="w-12 h-12 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <p className="text-base font-black text-white uppercase tracking-wider">{title}</p>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed">{hint}</p>
      <button onClick={onGoToDesign} className="nim-btn-yellow mt-2">{cta}</button>
    </div>
  );
}
