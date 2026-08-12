import { useDropzone } from 'react-dropzone';
import { UploadSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
  onDrop: (file: File) => void;
  disabled?: boolean;
}

/** Slot lightbox kosong — hairline dashed, bukan card membulat. */
export function ImageDropzone({ onDrop, disabled }: ImageDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxFiles: 1,
    disabled,
    onDrop: (accepted) => {
      if (accepted[0]) onDrop(accepted[0]);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-surface transition-colors',
        isDragActive && 'border-positive bg-surface-raised',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input {...getInputProps()} />
      <UploadSimple size={28} weight="thin" className="text-text-muted" />
      <div className="max-w-[220px] text-center">
        <p className="font-body text-sm text-text">
          {isDragActive ? 'Lepaskan di sini' : 'Seret citra X-ray, atau klik untuk pilih'}
        </p>
        <p className="mt-1 font-mono text-[11px] text-text-muted">JPG / PNG</p>
      </div>
    </div>
  );
}
