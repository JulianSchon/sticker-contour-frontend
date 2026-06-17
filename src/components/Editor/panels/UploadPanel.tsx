import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLang } from '../../../lib/LangContext.ts';

interface Props {
  onImage: (file: File) => void;
}

export function UploadPanel({ onImage }: Props) {
  const { t } = useLang();
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onImage(files[0]);
  }, [onImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [], 'image/webp': [] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="space-y-2">
      <p className="nim-label">{t.edToolUploads}</p>
      <div
        {...getRootProps()}
        className={`rounded-lg border border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-nim-yellow bg-nim-yellow/5' : 'border-white/15 hover:border-white/30'
        }`}
      >
        <input {...getInputProps()} />
        <svg className="w-5 h-5 mx-auto text-white/30 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="text-xs text-white/50 leading-snug">{t.dragDrop}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{t.dropFormats}</p>
      </div>
    </div>
  );
}
