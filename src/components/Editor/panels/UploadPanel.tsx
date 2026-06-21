import { useCallback, type ChangeEvent } from 'react';
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

  const onPick = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 20 * 1024 * 1024) onImage(file);
    e.target.value = ''; // allow re-selecting the same file
  }, [onImage]);

  return (
    <div className="space-y-2">
      <p className="nim-label">{t.edToolUploads}</p>

      {/* Desktop: drag & drop zone (also click-to-upload) */}
      <div
        {...getRootProps()}
        className={`hidden sm:block rounded-lg border border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
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

      {/* Mobile: a plain upload button (drag & drop is useless on touch) */}
      <label className="sm:hidden nim-btn-yellow w-full flex items-center justify-center gap-2 cursor-pointer">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {t.uploadImage}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </label>
      <p className="sm:hidden text-[10px] text-white/25 text-center">{t.dropFormats}</p>
    </div>
  );
}
