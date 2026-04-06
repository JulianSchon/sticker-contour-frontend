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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {tab === 'print-planning' ? 'Print with OPOS regmarks' : 'Sticker Contour Cut Generator'}
              </h1>
              <p className="text-xs text-gray-500">Print-ready PDF with CutContour spot color · Roland VersaWorks / Mimaki RasterLink</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab('contour')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'contour'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contour Generator
            </button>
            <button
              onClick={() => setTab('print-planning')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'print-planning'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Print Planning
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'contour' && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
            <div className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">1. Upload Image</h2>
                <ImageUpload onImageSelected={handleImageSelected} />
                {file && (
                  <p className="mt-2 text-xs text-gray-500 truncate">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">2. Adjust Parameters</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <ParameterPanel params={params} onChange={setParams} />
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">3. Download</h2>
                <DownloadButton file={file} params={params} />
              </section>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Live Preview</h2>

              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
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
    </div>
  );
}
