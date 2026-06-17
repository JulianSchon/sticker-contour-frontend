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
    <div className="space-y-3">
      <p className="nim-label">{t.edToolUploads}</p>
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-nim-yellow bg-nim-yellow/5' : 'border-white/15 hover:border-white/30'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-xs text-white/50">{t.dragDrop}</p>
        <p className="text-xs text-white/25 mt-1">{t.dropFormats}</p>
      </div>
    </div>
  );
}
