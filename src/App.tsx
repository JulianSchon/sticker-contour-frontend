import { useState } from 'react';
import { ImageUpload } from './components/ImageUpload.tsx';
import { ParameterPanel } from './components/ParameterPanel.tsx';
import { CanvasPreview } from './components/CanvasPreview.tsx';
import { DownloadButton } from './components/DownloadButton.tsx';
import { PrintPlanningTab } from './components/PrintPlanning/PrintPlanningTab.tsx';
import { WordpressPrintPlanningTab } from './components/PrintPlanning/WordpressPrintPlanningTab.tsx';
import { useContour } from './hooks/useContour.ts';
import type { ContourParams } from './types/contour.ts';
import { LangContext } from './lib/LangContext.ts';
import { translations, type Lang } from './lib/i18n.ts';
import { ShapeSelector } from './components/ShapeSelector.tsx';

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

type Tab = 'contour' | 'print-planning';
type WpMode = null | 'single' | 'sheet';

const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

export default function App() {
  const [tab, setTab] = useState<Tab>('contour');
  const [wpMode, setWpMode] = useState<WpMode>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [params, setParams] = useState<ContourParams>(DEFAULT_PARAMS);
  const [stickerWidthCm, setStickerWidthCm] = useState<number | null>(null);
  const [stickerHeightCm, setStickerHeightCm] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('sv');
  const t = translations[lang];

  const { data: contour, isLoading, error } = useContour(file, params);

  const handleImageSelected = (f: File, dataUrl: string) => {
    setFile(f);
    setImageDataUrl(dataUrl);
  };

  // ── Header tagline ──────────────────────────────────────────────────────────
  const headerTagline = IS_WORDPRESS
    ? (wpMode === 'single' ? t.taglineContour : wpMode === 'sheet' ? t.taglinePrint : 'CUTZ')
    : (tab === 'print-planning' ? t.taglinePrint : t.taglineContour);

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

            {/* Tab switcher — non-WP only */}
            {!IS_WORDPRESS && (
              <nav className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                {([
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
                  {wpMode === 'single' ? t.modeSingle : t.modeSheet}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">

        {/* ── WordPress: mode selection landing ── */}
        {IS_WORDPRESS && wpMode === null && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">{t.modeSelectTitle}</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
              {/* Single sticker */}
              <button
                onClick={() => setWpMode('single')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-nim-yellow hover:bg-nim-yellow/5 transition-all text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-nim-yellow/10 border border-nim-yellow/20 flex items-center justify-center group-hover:bg-nim-yellow/20 transition-colors">
                  <svg className="w-8 h-8 text-nim-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="w-full">
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-nim-yellow transition-colors">{t.modeSingle}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeSingleDesc}</p>
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

        {/* ── WordPress: single sticker mode ── */}
        {IS_WORDPRESS && wpMode === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <div className="flex flex-col gap-4">
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="01" label={t.step01} /></div>
                <div className="px-5 pb-5">
                  <ImageUpload
                    onImageSelected={handleImageSelected}
                    onSizeChange={(w, h) => { setStickerWidthCm(w); setStickerHeightCm(h); }}
                  />
                  {file && (
                    <p className="mt-2 text-xs text-white/25 truncate flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-nim-yellow shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {file.name} — {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="02" label={lang === 'sv' ? 'Välj form' : 'Cut Shape'} /></div>
                <div className="px-5 pb-5">
                  <ShapeSelector
                    value={params.shapeType}
                    onChange={shape => setParams(p => ({ ...p, shapeType: shape }))}
                    shapeSize={params.shapeSize}
                    onSizeChange={size => setParams(p => ({ ...p, shapeSize: size }))}
                    shapeOffsetX={params.shapeOffsetX}
                    shapeOffsetY={params.shapeOffsetY}
                    onOffsetChange={(x, y) => setParams(p => ({ ...p, shapeOffsetX: x, shapeOffsetY: y }))}
                  />
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="03" label={t.step02} /></div>
                <div className="px-5 pb-5">
                  <ParameterPanel params={params} onChange={setParams} />
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="04" label={t.step03wp} /></div>
                <div className="px-5 pb-5">
                  <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />
                </div>
              </div>
            </div>
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
          </div>
        )}

        {/* ── WordPress: sheet mode ── */}
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab />
        )}

        {/* ── Non-WordPress: original tab layout ── */}
        {!IS_WORDPRESS && tab === 'contour' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

            <div className="flex flex-col gap-4">
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="01" label={t.step01} /></div>
                <div className="px-5 pb-5">
                  <ImageUpload
                    onImageSelected={handleImageSelected}
                    onSizeChange={(w, h) => { setStickerWidthCm(w); setStickerHeightCm(h); }}
                  />
                  {file && (
                    <p className="mt-2 text-xs text-white/25 truncate flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-nim-yellow shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {file.name} — {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="02" label={lang === 'sv' ? 'Välj form' : 'Cut Shape'} /></div>
                <div className="px-5 pb-5">
                  <ShapeSelector
                    value={params.shapeType}
                    onChange={shape => setParams(p => ({ ...p, shapeType: shape }))}
                    shapeSize={params.shapeSize}
                    onSizeChange={size => setParams(p => ({ ...p, shapeSize: size }))}
                    shapeOffsetX={params.shapeOffsetX}
                    shapeOffsetY={params.shapeOffsetY}
                    onOffsetChange={(x, y) => setParams(p => ({ ...p, shapeOffsetX: x, shapeOffsetY: y }))}
                  />
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="03" label={t.step02} /></div>
                <div className="px-5 pb-5">
                  <ParameterPanel params={params} onChange={setParams} />
                </div>
              </div>
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2"><StepLabel n="04" label={t.step03} /></div>
                <div className="px-5 pb-5">
                  <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />
                </div>
              </div>
            </div>

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
          </div>
        )}

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
