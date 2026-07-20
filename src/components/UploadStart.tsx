import { useState } from 'react';
import { ImageUpload } from './ImageUpload.tsx';
import { useLang } from '../lib/LangContext.ts';

interface Props {
  /** Called when a valid image + size are set — same signature as the editor's onComplete. */
  onReady: (file: File, dataUrl: string, widthCm: number, heightCm: number) => void;
}

/** Upload-only entry: pick an image + size, then continue to the cut page. */
export function UploadStart({ onReady }: Props) {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [widthCm, setWidthCm] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);

  const ready = !!file && !!dataUrl && !!widthCm && !!heightCm;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <ImageUpload
        onImageSelected={(f, d) => { setFile(f); setDataUrl(d); }}
        onSizeChange={(w, h) => { setWidthCm(w); setHeightCm(h); }}
      />
      <button
        onClick={() => { if (ready) onReady(file!, dataUrl!, widthCm!, heightCm!); }}
        disabled={!ready}
        className="nim-btn-yellow w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {`${t.edContinue} →`}
      </button>
    </div>
  );
}
