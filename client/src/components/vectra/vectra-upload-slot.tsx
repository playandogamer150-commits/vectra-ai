import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";

interface VectraUploadSlotProps {
  images: { id: string; url: string }[];
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
    <div className={cn("space-y-3", className)} data-testid={testId}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">{label}</span>
          <span className="text-xs text-white/30">{images.length}/{maxImages}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.03] group"
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              className={cn(
                "absolute top-1 right-1 p-1 rounded-md",
                "bg-black/60 text-white/70 hover:text-white",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
              data-testid={`${testId}-remove-${img.id}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "aspect-square rounded-lg",
              "border-2 border-dashed border-white/10",
              "flex flex-col items-center justify-center gap-1",
              "text-white/30 hover:text-white/50 hover:border-white/20",
              "transition-all duration-200"
            )}
            data-testid={`${testId}-add`}
          >
            <Upload className="w-4 h-4" />
            <span className="text-[10px]">Upload</span>
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
