import { useRef, useState } from 'react';
import type { PlannedFile } from '../../types/printPlanning.ts';
import { fetchPdfDimensions } from '../../lib/api.ts';
import { renderPdfFirstPage } from '../../lib/pdfPreview.ts';

const FILE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const PRESET_WIDTHS = [320, 500, 610, 762, 1000, 1270, 1520];

interface Props {
  foilWidthMm: number;
  onFoilWidthChange: (v: number) => void;
  files: PlannedFile[];
  onFilesChange: (files: PlannedFile[]) => void;
}

export function FileSetupPanel({ foilWidthMm, onFoilWidthChange, files, onFilesChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  async function processFiles(picked: File[]) {
    const tempIds = picked.map(() => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setLoadingIds(prev => new Set([...prev, ...tempIds]));

    const newFiles: PlannedFile[] = [];
    for (let i = 0; i < picked.length; i++) {
      const f = picked[i];
      const colorIdx = (files.length + newFiles.length) % FILE_COLORS.length;
      try {
        const [dims, previewUrl] = await Promise.all([
          fetchPdfDimensions(f),
          renderPdfFirstPage(f).catch(() => undefined),
        ]);
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: f,
          name: f.name,
          widthMm: dims.widthMm,
          heightMm: dims.heightMm,
          quantity: 1,
          color: FILE_COLORS[colorIdx],
          previewUrl,
        });
      } catch {
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: f,
          name: f.name,
          widthMm: 100,
          heightMm: 100,
          quantity: 1,
          color: FILE_COLORS[colorIdx],
        });
      }
    }
    setLoadingIds(new Set());
    onFilesChange([...files, ...newFiles]);
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (picked.length) await processFiles(picked);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const picked = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (picked.length) processFiles(picked);
  }

  function updateQuantity(id: string, qty: number) {
    onFilesChange(files.map(f => f.id === id ? { ...f, quantity: Math.max(1, qty) } : f));
  }

  function removeFile(id: string) {
    onFilesChange(files.filter(f => f.id !== id));
  }

  const isLoading = loadingIds.size > 0;

  return (
    <div className="flex flex-col gap-6">

      {/* Foil width */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Foil Width
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={10}
            max={2000}
            step={1}
            value={foilWidthMm}
            onChange={e => onFoilWidthChange(Number(e.target.value))}
            className="w-20 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <span className="text-sm text-gray-400 font-medium">mm</span>
        </div>
        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => onFoilWidthChange(w)}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                foilWidthMm === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          PDF Files
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFilePick}
          className="hidden"
          id="pdf-picker"
        />
        <label
          htmlFor="pdf-picker"
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : isLoading
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs text-blue-500 font-medium">Processing…</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-700">Drop PDFs here</p>
                <p className="text-xs text-gray-400">or click to browse</p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Files
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {files.length}
            </span>
          </div>

          <div className="space-y-2">
            {files.map(f => (
              <div
                key={f.id}
                className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                {/* Preview thumbnail or color swatch */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-gray-100">
                  {f.previewUrl ? (
                    <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${f.color}22` }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                    </div>
                  )}
                </div>

                {/* Name + dims */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                    {f.name.replace(/\.pdf$/i, '')}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">
                    {Math.round(f.widthMm)} × {Math.round(f.heightMm)} mm
                  </p>
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(f.id, f.quantity - 1)}
                    className="w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base leading-none"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    value={f.quantity}
                    onChange={e => updateQuantity(f.id, parseInt(e.target.value, 10) || 1)}
                    className="w-10 text-center text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none py-1"
                  />
                  <button
                    onClick={() => updateQuantity(f.id, f.quantity + 1)}
                    className="w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base leading-none"
                  >+</button>
                </div>

                {/* Remove — only visible on hover */}
                <button
                  onClick={() => removeFile(f.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
