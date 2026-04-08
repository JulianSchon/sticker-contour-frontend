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
  kissOffset: 50,
  perfOffset: 50,
  smoothing: 4,
  enclose: false,
  cutMode: 'kiss',
  shapeType: 'contour',
  shapeSize: 90,
  shapeOffsetX: 0,
  shapeOffsetY: 0,
};

type Tab = 'contour' | 'print-planning';

const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

export default function App() {
  const [tab, setTab] = useState<Tab>('contour');
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

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
    <div className="min-h-screen bg-nim-black flex flex-col">

      {/* ── Header ── */}
      <header className="bg-nim-darker border-b-2 border-nim-yellow/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src="/nimstick-logo.png"
              alt="Nimstick"
              className="h-10 w-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="h-6 w-px bg-white/10" />
            <div>
              <p className="text-white font-bold text-sm tracking-widest uppercase leading-none">CUTZ</p>
              <p className="text-white/30 text-xs tracking-wider mt-0.5">
                {tab === 'print-planning' ? t.taglinePrint : t.taglineContour}
              </p>
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

            {/* Tab switcher */}
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
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">

        {tab === 'contour' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

            {/* ── Left sidebar ── */}
            <div className="flex flex-col gap-4">

              {/* Upload */}
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2">
                  <StepLabel n="01" label={t.step01} />
                </div>
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

              {/* Shape selector */}
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2">
                  <StepLabel n="02" label={lang === 'sv' ? 'Välj form' : 'Cut Shape'} />
                </div>
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

              {/* Parameters */}
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2">
                  <StepLabel n="03" label={t.step02} />
                </div>
                <div className="px-5 pb-5">
                  <ParameterPanel params={params} onChange={setParams} />
                </div>
              </div>

              {/* Download / Save */}
              <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 pt-5 pb-2">
                  <StepLabel n="04" label={IS_WORDPRESS ? t.step03wp : t.step03} />
                </div>
                <div className="px-5 pb-5">
                  <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />
                </div>
              </div>

            </div>

            {/* ── Preview ── */}
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
                <CanvasPreview
                  imageDataUrl={imageDataUrl}
                  contour={contour ?? null}
                  params={params}
                  isLoading={isLoading}
                />
              </div>
            </div>

          </div>
        )}

        {tab === 'print-planning' && (IS_WORDPRESS ? <WordpressPrintPlanningTab /> : <PrintPlanningTab />)}
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
