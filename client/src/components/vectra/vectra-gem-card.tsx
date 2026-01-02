import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ScanFace, Camera, Fingerprint, Sparkles, Zap, ShieldCheck, Eye } from "lucide-react";

interface VectraGemCardProps {
    id: string;
    name: string;
    description: string;
    category: string;
    isActive: boolean;
    onToggle: (isActive: boolean) => void;
    className?: string;
}

export function VectraGemCard({
    id,
    name,
    description,
    category,
    isActive,
    onToggle,
    className
}: VectraGemCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg rotation
        const rotateY = ((x - centerX) / centerX) * 10;

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
    };

    // Icon selection based on category/name
    const getIcon = () => {
        if (name.includes("FACE")) return <ScanFace className="w-8 h-8" />;
        if (name.includes("INSTAGRAM")) return <Camera className="w-8 h-8" />;
        if (name.includes("TATTOO")) return <Fingerprint className="w-8 h-8" />;
        if (name.includes("REAL LIFE")) return <Eye className="w-8 h-8" />; // New icon
        return <Sparkles className="w-8 h-8" />;
    };


    return (
        <div
            ref={cardRef}
            className={cn(
                "group relative h-full w-full cursor-pointer select-none perspective-1000",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => onToggle(!isActive)}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-200 ease-out preserve-3d",
                    isActive ? "scale-[1.02]" : "scale-100 hover:scale-[1.01]"
                )}
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                }}
            >
                {/* Card Background & Border */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-xl border transition-all duration-300",
                        isActive
                            ? "bg-zinc-900/90 border-green-500/50 shadow-[0_0_30px_-10px_rgba(74,222,128,0.3)]"
                            : "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/60"
                    )}
                />

                {/* Content Container */}
                <div className="relative flex h-full flex-col justify-between p-5">
                    {/* Header */}
                    <div>
                        <div className="mb-4 flex items-start justify-between">
                            <div
                                className={cn(
                                    "rounded-lg p-2 transition-colors duration-300",
                                    isActive
                                        ? "bg-green-500/10 text-green-400 shadow-[0_0_15px_-5px_rgba(74,222,128,0.3)]"
                                        : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60"
                                )}
                            >
                                {getIcon()}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <Switch checked={isActive} onCheckedChange={onToggle} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h3
                                className={cn(
                                    "font-bold tracking-tight transition-colors text-lg",
                                    isActive ? "text-white" : "text-white/80"
                                )}
                            >
                                {name}
                            </h3>
                            <p className="line-clamp-2 text-xs font-mono leading-relaxed text-white/40">
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* Footer / Tags */}
                    <div className="flex gap-2 pt-4">
                        <span
                            className={cn(
                                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest transition-colors",
                                isActive
                                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                                    : "border-white/10 bg-white/5 text-white/30"
                            )}
                        >
                            {category === "facial_biometrics"
                                ? "BIOMETRICS"
                                : category === "identity_preservation"
                                    ? "IDENTITY"
                                    : category === "ugc_realism"
                                        ? "REALISM"
                                        : "OPTIMIZER"}
                        </span>
                        {isActive && (
                            <span className="flex items-center gap-1.5 animate-pulse font-mono text-[9px] text-green-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                                ACTIVE
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
