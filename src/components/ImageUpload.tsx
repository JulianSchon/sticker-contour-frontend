import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onImageSelected: (file: File, dataUrl: string) => void;
}

const ACCEPTED = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export function ImageUpload({ onImageSelected }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onImageSelected(file, dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const borderColor = isDragReject
    ? 'border-red-400'
    : isDragActive
    ? 'border-blue-400'
    : 'border-gray-300';

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${borderColor} hover:border-blue-400 bg-gray-50 hover:bg-blue-50`}
    >
      <input {...getInputProps()} />
      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      {isDragReject ? (
        <p className="text-sm text-red-500">PNG, JPEG, or WEBP only</p>
      ) : isDragActive ? (
        <p className="text-sm text-blue-500">Drop to upload</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">Drag & drop your sticker image here</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPEG, WEBP — up to 20 MB</p>
        </>
      )}
    </div>
  );
}
