import { useState } from 'react';
import { downloadPdf, generatePdfBlob } from '../lib/api.ts';
import type { ContourParams } from '../types/contour.ts';

interface Props {
  file: File | null;
  params: ContourParams;
  disabled?: boolean;
  widthCm?: number | null;
  heightCm?: number | null;
}

const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

export function DownloadButton({ file, params, disabled, widthCm, heightCm }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const buildFilename = () => {
    if (widthCm && heightCm) return `sticker-cutcontour-${widthCm}x${heightCm}cm.pdf`;
    if (widthCm) return `sticker-cutcontour-${widthCm}cm.pdf`;
    return 'sticker-cutcontour.pdf';
  };

  const handleClick = async () => {
    if (!file) return;
    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    try {
      if (IS_WORDPRESS) {
        const pdfBlob = await generatePdfBlob(file, params);
        window.parent.postMessage(
          { type: 'nimstick_save_design', pdf: pdfBlob, image: file, filename: buildFilename() },
          '*'
        );
      } else {
        await downloadPdf(file, params, buildFilename());
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const label = IS_WORDPRESS ? 'Save Design' : 'Download PDF';
  const successLabel = IS_WORDPRESS ? 'Design Saved!' : 'Downloaded!';

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={disabled || isGenerating || !file}
        className="nim-btn-yellow w-full"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {IS_WORDPRESS ? 'Generating…' : 'Generating…'}
          </>
        ) : success ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {successLabel}
          </>
        ) : IS_WORDPRESS ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {label}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {label}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-white/20 text-center leading-relaxed">
        {IS_WORDPRESS ? 'Custom sticker · CutContour PDF' : 'Print-ready PDF · CutContour spot color'}
      </p>
    </div>
  );
}
