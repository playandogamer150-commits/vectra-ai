import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";

interface UploadedImage {
  id: string;
  url: string;
}

interface VectraUploadSlotProps {
  images: UploadedImage[];
  maxImages: number;
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  label?: string;
  className?: string;
  testId?: string;
}

export function VectraUploadSlot({
  images,
  maxImages,
  onUpload,
  onRemove,
  label,
  className,
  testId,
}: VectraUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload(files.slice(0, maxImages - images.length));
    }
    e.target.value = "";
  };

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</span>
          <span className="vectra-badge">
            {images.length}/{maxImages}
          </span>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1.5">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-white/5 group"
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`${testId}-remove-${img.id}`}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="vectra-upload"
            data-testid={`${testId}-add`}
          >
            <Upload className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
