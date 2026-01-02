import { cn } from "@/lib/utils";

export function VectraLaodingTriangle({ className }: { className?: string }) {
    return (
        <div className={cn("relative w-5 h-5", className)}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-spin w-full h-full"
                style={{ animationDuration: '2s' }}
            >
                <path
                    d="M12 2L2 22H22L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-25"
                />
                <path
                    d="M12 2L2 22H22L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-75"
                    strokeDasharray="60"
                    strokeDashoffset="60"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        values="60;0;60"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </path>
            </svg>
            {/* Inner pulsing triangle */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
            </div>
        </div>
    );
}
