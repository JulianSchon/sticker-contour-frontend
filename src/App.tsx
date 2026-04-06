import { useState } from 'react';
import { ImageUpload } from './components/ImageUpload.tsx';
import { ParameterPanel } from './components/ParameterPanel.tsx';
import { CanvasPreview } from './components/CanvasPreview.tsx';
import { DownloadButton } from './components/DownloadButton.tsx';
import { PrintPlanningTab } from './components/PrintPlanning/PrintPlanningTab.tsx';
import { useContour } from './hooks/useContour.ts';
import type { ContourParams } from './types/contour.ts';

const DEFAULT_PARAMS: ContourParams = {
  threshold: 128,
  kissOffset: 50,
  perfOffset: 50,
  smoothing: 1,
  enclose: false,
  cutMode: 'kiss',
};

type Tab = 'contour' | 'print-planning';

export default function App() {
  const [tab, setTab] = useState<Tab>('contour');
  const [file, setFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [params, setParams] = useState<ContourParams>(DEFAULT_PARAMS);

  const { data: contour, isLoading, error } = useContour(file, params);

  const handleImageSelected = (f: File, dataUrl: string) => {
    setFile(f);
    setImageDataUrl(dataUrl);
  };

  return (
    <div className="min-h-screen bg-nim-black flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-nim-darker border-b border-white/5 px-6 py-2 flex items-center justify-between text-xs text-white/30">
        <span>NIMSTICK CUTZ — INTERNAL PRINT TOOL</span>
        <span>Roland VersaWorks · Mimaki RasterLink</span>
      </div>

      {/* ── Header ── */}
      <header className="bg-nim-black border-b-4 border-nim-yellow px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Nimstick-style badge */}
            <div className="relative">
              <div
                className="bg-nim-yellow px-3 py-1 rounded-lg"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 95% 100%, 0 100%)' }}
              >
                <span
                  className="font-display text-nim-black text-2xl tracking-tight leading-none"
                  style={{ WebkitTextStroke: '1px #111' }}
                >
                  NIMSTICK
                </span>
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-widest uppercase leading-tight">
                CUTZ
              </div>
              <div className="text-white/30 text-xs tracking-widest uppercase">
                {tab === 'print-planning' ? 'Print with OPOS Regmarks' : 'Contour Cut Generator'}
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setTab('contour')}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                tab === 'contour'
                  ? 'bg-nim-yellow text-nim-black shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Contour
            </button>
            <button
              onClick={() => setTab('print-planning')}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                tab === 'print-planning'
                  ? 'bg-nim-yellow text-nim-black shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Print Planning
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {tab === 'contour' && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">

            {/* Left column */}
            <div className="space-y-5">

              <section>
                <p className="nim-label mb-3">01 — Upload Image</p>
                <ImageUpload onImageSelected={handleImageSelected} />
                {file && (
                  <p className="mt-2 text-xs text-white/30 truncate">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
                )}
              </section>

              <section>
                <p className="nim-label mb-3">02 — Parameters</p>
                <div className="nim-card p-4">
                  <ParameterPanel params={params} onChange={setParams} />
                </div>
              </section>

              <section>
                <p className="nim-label mb-3">03 — Download</p>
                <DownloadButton file={file} params={params} />
              </section>

            </div>

            {/* Right column — preview */}
            <div className="flex flex-col gap-3">
              <p className="nim-label">Live Preview</p>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
                  <strong>Contour detection failed:</strong> {error.message}
                </div>
              )}

              <CanvasPreview
                imageDataUrl={imageDataUrl}
                contour={contour ?? null}
                params={params}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {tab === 'print-planning' && <PrintPlanningTab />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-3 text-center text-xs text-white/20">
        © Nimstick · nimstick.se
      </footer>
    </div>
  );
}
