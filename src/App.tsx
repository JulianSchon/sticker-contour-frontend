import { useState } from 'react';
import { ParameterPanel } from './components/ParameterPanel.tsx';
import { CanvasPreview } from './components/CanvasPreview.tsx';
import { DownloadButton } from './components/DownloadButton.tsx';
import { PrintPlanningTab } from './components/PrintPlanning/PrintPlanningTab.tsx';
import { WordpressPrintPlanningTab } from './components/PrintPlanning/WordpressPrintPlanningTab.tsx';
import { DesignEditor } from './components/Editor/DesignEditor.tsx';
import { useContour } from './hooks/useContour.ts';
import type { ContourParams } from './types/contour.ts';
import { LangContext } from './lib/LangContext.ts';
import { translations, type Lang } from './lib/i18n.ts';
import { MaterialFinishPicker, type Material, type Finish } from './components/MaterialFinishPicker.tsx';

const DEFAULT_PARAMS: ContourParams = {
  threshold: 128,
  kissOffset: 3,
  perfOffset: 3,
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
  const [material, setMaterial] = useState<Material>('vinyl');
  const [finish, setFinish] = useState<Finish>('glossy');
  const [lang, setLang] = useState<Lang>('sv');
  const t = translations[lang];

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

  const goToDesign = () => { if (IS_WORDPRESS) setWpMode('design'); else setTab('design'); };

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
        <CanvasPreview imageDataUrl={imageDataUrl} contour={contour ?? null} params={params} isLoading={isLoading} />
      </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <div className="flex flex-col gap-4">
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2"><StepLabel n="01" label={t.step02} /></div>
          <div className="px-5 pb-5">
            <ParameterPanel params={params} onChange={setParams} />
          </div>
        </div>
        {IS_WORDPRESS && (
          <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 pt-5 pb-2"><StepLabel n="02" label={t.stepMaterial} /></div>
            <div className="px-5 pb-5">
              <MaterialFinishPicker
                material={material} finish={finish}
                onMaterialChange={setMaterial} onFinishChange={setFinish}
              />
            </div>
          </div>
        )}
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2"><StepLabel n={IS_WORDPRESS ? '03' : '02'} label={IS_WORDPRESS ? t.step03wp : t.step03} /></div>
          <div className="px-5 pb-5">
            {IS_WORDPRESS
              ? <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} material={material} finish={finish} />
              : <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />}
          </div>
        </div>
      </div>
      {previewColumn}
    </div>
  );

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
    <div className="min-h-screen bg-nim-black flex flex-col">

      {/* ── Header ── */}
      <header className="bg-nim-darker border-b-2 border-nim-yellow/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">

          {/* Logo + back button (WP mode with a chosen mode) */}
          <div className="flex items-center gap-4">
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
            <img
              src="/nimstick-logo.png"
              alt="Nimstick"
              className="h-10 w-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="h-6 w-px bg-white/10" />
            <div>
              <p className="text-white font-bold text-sm tracking-widest uppercase leading-none">CUTZ</p>
              <p className="text-white/30 text-xs tracking-wider mt-0.5">{headerTagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'sv' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white/40 hover:text-white/70 hover:border-white/20 transition-all uppercase tracking-widest"
            >
              {lang === 'en' ? 'SV' : 'EN'}
            </button>

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
                    onClick={() => setTab(tb.id)}
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
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">

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

        {/* ── WordPress: design (default) ── */}
        {IS_WORDPRESS && wpMode === 'design' && <DesignEditor onComplete={handleDesignComplete} />}

        {/* ── WordPress: cut dialog (post-design) ── */}
        {IS_WORDPRESS && wpMode === 'single' && cutDialog}

        {/* ── WordPress: sheet mode ── */}
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab />
        )}

        {/* ── Non-WordPress: tabs ── */}
        {!IS_WORDPRESS && tab === 'design' && <DesignEditor onComplete={handleDesignComplete} />}

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

function StepLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-5 h-5 rounded-md bg-nim-yellow flex items-center justify-center text-nim-black text-xs font-black leading-none shrink-0">
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{label}</span>
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
