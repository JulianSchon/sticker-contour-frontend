import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

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

function checkResolution(w: number, h: number, sizeCm: number | null): ResolutionStatus {
  if (sizeCm === null || sizeCm <= 0) {
    // Fallback to fixed thresholds when no size entered
    if (w < 200 || h < 200) return 'blocked';
    if (w < 500 || h < 500) return 'low';
    return 'ok';
  }
  const minPx  = cmToPixels(sizeCm, DPI_MIN);
  const goodPx = cmToPixels(sizeCm, DPI_GOOD);
  if (w < minPx  || h < minPx)  return 'blocked';
  if (w < goodPx || h < goodPx) return 'low';
  return 'ok';
}

export function ImageUpload({ onImageSelected }: Props) {
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>('idle');
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [sizeCm, setSizeCm] = useState<number | null>(null);
  const [sizeInput, setSizeInput] = useState('');

  const evaluate = useCallback((w: number, h: number, size: number | null, file: File, dataUrl: string) => {
    const status = checkResolution(w, h, size);
    setResolutionStatus(status);
    if (status !== 'blocked') {
      onImageSelected(file, dataUrl);
    }
  }, [onImageSelected]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setImageDimensions({ w, h });
        evaluate(w, h, sizeCm, file, dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [sizeCm, evaluate]);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSizeInput(raw);
    const parsed = parseFloat(raw);
    const size = isNaN(parsed) || parsed <= 0 ? null : parsed;
    setSizeCm(size);
    if (imageDimensions) {
      const status = checkResolution(imageDimensions.w, imageDimensions.h, size);
      setResolutionStatus(status);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const effectiveDpi = imageDimensions && sizeCm && sizeCm > 0
    ? Math.round((imageDimensions.w / sizeCm) * 2.54)
    : null;

  return (
    <div className="space-y-2">

      {/* Size input */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-white/60 shrink-0">Sticker size</label>
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            max="100"
            step="0.5"
            value={sizeInput}
            onChange={handleSizeChange}
            placeholder="e.g. 10"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-nim-yellow/50 pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">cm</span>
        </div>
        {effectiveDpi !== null && (
          <span className={`text-xs font-bold shrink-0 ${
            resolutionStatus === 'ok'      ? 'text-green-400'
            : resolutionStatus === 'low'   ? 'text-yellow-400'
            : 'text-red-400'
          }`}>
            {effectiveDpi} DPI
          </span>
        )}
      </div>

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
      {resolutionStatus === 'blocked' && imageDimensions && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950/50 border border-red-800">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-bold text-red-400">
              Resolution too low ({imageDimensions.w}×{imageDimensions.h}px
              {effectiveDpi !== null ? `, ${effectiveDpi} DPI` : ''})
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {sizeCm ? `Minimum ${DPI_MIN} DPI required for a ${sizeCm}cm sticker.` : 'Minimum 200×200px required.'} Please upload a higher resolution image.
            </p>
          </div>
        </div>
      )}

      {resolutionStatus === 'low' && imageDimensions && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-yellow-950/50 border border-yellow-700">
          <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-bold text-yellow-400">
              Low resolution ({imageDimensions.w}×{imageDimensions.h}px
              {effectiveDpi !== null ? `, ${effectiveDpi} DPI` : ''})
            </p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              {sizeCm ? `Recommended ${DPI_GOOD} DPI for a ${sizeCm}cm sticker. Print quality may be reduced.` : 'Recommended minimum is 500×500px. Print quality may be reduced.'}
            </p>
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
            {effectiveDpi !== null ? `, ${effectiveDpi} DPI` : ''})
          </p>
        </div>
      )}
    </div>
  );
}
