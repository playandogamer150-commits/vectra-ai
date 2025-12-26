import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {images.length}/{maxImages}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => onRemove(img.id)}
              className={cn(
                "absolute top-1 right-1 h-6 w-6",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
              data-testid={`${testId}-remove-${img.id}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "aspect-square rounded-md",
              "border border-dashed border-muted-foreground/25",
              "flex flex-col items-center justify-center gap-0.5",
              "text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
              "transition-all duration-200"
            )}
            data-testid={`${testId}-add`}
          >
            <Upload className="w-3 h-3" />
            <span className="text-[8px]">+</span>
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
