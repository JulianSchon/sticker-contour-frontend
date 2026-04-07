import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { enhanceImage } from '../lib/api.ts';

interface Props {
  onImageSelected: (file: File, dataUrl: string) => void;
}

const ACCEPTED = {
  'image/png':  ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

const DPI_MIN  = 150;
const DPI_GOOD = 300;

function cmToPixels(cm: number, dpi: number) {
  return (cm / 2.54) * dpi;
}

type ResolutionStatus = 'ok' | 'low' | 'blocked' | 'idle';

function checkResolution(
  imgW: number, imgH: number,
  widthCm: number | null, heightCm: number | null
): ResolutionStatus {
  // If neither dimension entered, fall back to fixed thresholds
  if (!widthCm && !heightCm) {
    if (imgW < 200 || imgH < 200) return 'blocked';
    if (imgW < 500 || imgH < 500) return 'low';
    return 'ok';
  }
  // Check each axis that has been specified
  const checks: boolean[] = [];
  const goodChecks: boolean[] = [];
  if (widthCm && widthCm > 0) {
    checks.push(imgW >= cmToPixels(widthCm, DPI_MIN));
    goodChecks.push(imgW >= cmToPixels(widthCm, DPI_GOOD));
  }
  if (heightCm && heightCm > 0) {
    checks.push(imgH >= cmToPixels(heightCm, DPI_MIN));
    goodChecks.push(imgH >= cmToPixels(heightCm, DPI_GOOD));
  }
  if (checks.some(c => !c))     return 'blocked';
  if (goodChecks.some(c => !c)) return 'low';
  return 'ok';
}

function effectiveDpi(imgPx: number, sizeCm: number) {
  return Math.round((imgPx / sizeCm) * 2.54);
}

export function ImageUpload({ onImageSelected }: Props) {
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>('idle');
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [widthCm, setWidthCm]   = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [widthInput, setWidthInput]   = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const evaluate = useCallback((
    imgW: number, imgH: number,
    wCm: number | null, hCm: number | null,
    file: File, dataUrl: string
  ) => {
    const status = checkResolution(imgW, imgH, wCm, hCm);
    setResolutionStatus(status);
    if (status !== 'blocked') onImageSelected(file, dataUrl);
  }, [onImageSelected]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setCurrentFile(file);
    setEnhanceError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setImageDimensions({ w, h });
        evaluate(w, h, widthCm, heightCm, file, dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [widthCm, heightCm, evaluate]);

  const handleEnhance = async () => {
    if (!currentFile) return;
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const { file: enhanced, dataUrl } = await enhanceImage(currentFile);
      setCurrentFile(enhanced);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setImageDimensions({ w, h });
        evaluate(w, h, widthCm, heightCm, enhanced, dataUrl);
      };
      img.src = dataUrl;
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleWidth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setWidthInput(raw);
    const val = parseFloat(raw);
    const wCm = isNaN(val) || val <= 0 ? null : val;
    setWidthCm(wCm);
    if (imageDimensions) {
      setResolutionStatus(checkResolution(imageDimensions.w, imageDimensions.h, wCm, heightCm));
    }
  };

  const handleHeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHeightInput(raw);
    const val = parseFloat(raw);
    const hCm = isNaN(val) || val <= 0 ? null : val;
    setHeightCm(hCm);
    if (imageDimensions) {
      setResolutionStatus(checkResolution(imageDimensions.w, imageDimensions.h, widthCm, hCm));
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const dpiW = imageDimensions && widthCm  ? effectiveDpi(imageDimensions.w, widthCm)  : null;
  const dpiH = imageDimensions && heightCm ? effectiveDpi(imageDimensions.h, heightCm) : null;
  const dpiDisplay = dpiW !== null && dpiH !== null
    ? Math.min(dpiW, dpiH)
    : (dpiW ?? dpiH);

  return (
    <div className="space-y-2">

      {/* Size inputs */}
      <div className="grid grid-cols-2 gap-2">
        {(['width', 'height'] as const).map((axis) => (
          <div key={axis}>
            <label className="text-xs font-semibold text-white/60 block mb-1 capitalize">{axis}</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="200"
                step="0.5"
                value={axis === 'width' ? widthInput : heightInput}
                onChange={axis === 'width' ? handleWidth : handleHeight}
                placeholder="e.g. 10"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-nim-yellow/50 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">cm</span>
            </div>
          </div>
        ))}
      </div>

      {/* DPI indicator */}
      {dpiDisplay !== null && (
        <p className={`text-xs font-bold ${
          resolutionStatus === 'ok'    ? 'text-green-400'
          : resolutionStatus === 'low' ? 'text-yellow-400'
          : 'text-red-400'
        }`}>
          Effective resolution: {dpiDisplay} DPI
        </p>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${isDragReject || resolutionStatus === 'blocked' ? 'border-red-500 bg-red-950/20'
          : resolutionStatus === 'low'                     ? 'border-yellow-600 bg-yellow-950/10'
          : isDragActive                                   ? 'border-nim-yellow bg-nim-yellow/10 scale-[1.01]'
          : 'border-white/10 hover:border-nim-yellow/50 hover:bg-white/5 bg-white/[0.03]'}`}
      >
        <input {...getInputProps()} />

        {isDragReject ? (
          <>
            <svg className="w-8 h-8 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-bold text-red-400">PNG, JPEG or WEBP only</p>
          </>
        ) : isDragActive ? (
          <>
            <svg className="w-8 h-8 text-nim-yellow mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-bold text-nim-yellow uppercase tracking-wider">Drop it!</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-nim-yellow/10 border border-nim-yellow/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-nim-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white/70">Drag & drop your sticker image</p>
            <p className="text-xs text-white/30 mt-1">PNG · JPEG · WEBP — up to 20 MB</p>
          </>
        )}
      </div>

      {/* Resolution feedback */}
      {(resolutionStatus === 'blocked' || resolutionStatus === 'low') && imageDimensions && (
        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg ${
          resolutionStatus === 'blocked'
            ? 'bg-red-950/50 border border-red-800'
            : 'bg-yellow-950/50 border border-yellow-700'
        }`}>
          <svg className={`w-4 h-4 shrink-0 mt-0.5 ${resolutionStatus === 'blocked' ? 'text-red-400' : 'text-yellow-400'}`} fill="currentColor" viewBox="0 0 20 20">
            {resolutionStatus === 'blocked'
              ? <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            }
          </svg>
          <div className="flex-1">
            <p className={`text-xs font-bold ${resolutionStatus === 'blocked' ? 'text-red-400' : 'text-yellow-400'}`}>
              {resolutionStatus === 'blocked' ? 'Resolution too low' : 'Low resolution'} ({imageDimensions.w}×{imageDimensions.h}px
              {dpiDisplay !== null ? `, ${dpiDisplay} DPI` : ''})
            </p>
            <p className={`text-xs mt-0.5 ${resolutionStatus === 'blocked' ? 'text-red-400/70' : 'text-yellow-400/70'}`}>
              {resolutionStatus === 'blocked'
                ? `Minimum ${DPI_MIN} DPI required.`
                : `Recommended ${DPI_GOOD} DPI for best print quality.`
              } Use AI to enhance.
            </p>
            <button
              onClick={handleEnhance}
              disabled={isEnhancing}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nim-yellow text-nim-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nim-yellow/90 transition-colors"
            >
              {isEnhancing ? (
                <>
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Enhancing… (this may take ~30s)
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Enhance with AI (4× upscale)
                </>
              )}
            </button>
            {enhanceError && (
              <p className="text-xs text-red-400 mt-1">{enhanceError}</p>
            )}
          </div>
        </div>
      )}

      {resolutionStatus === 'ok' && imageDimensions && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-950/40 border border-green-800/50">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-xs font-bold text-green-400">
            Good resolution ({imageDimensions.w}×{imageDimensions.h}px
            {dpiDisplay !== null ? `, ${dpiDisplay} DPI` : ''})
          </p>
        </div>
      )}
    </div>
  );
}
