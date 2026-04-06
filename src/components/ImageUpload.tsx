import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onImageSelected: (file: File, dataUrl: string) => void;
}

const ACCEPTED = {
  'image/png':  ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export function ImageUpload({ onImageSelected }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onImageSelected(file, e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all
        ${isDragReject  ? 'border-red-500 bg-red-950/20'
        : isDragActive  ? 'border-nim-yellow bg-nim-yellow/10 scale-[1.01]'
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
  );
}
