import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import type { GeneratedPrompt } from "@shared/schema";
import {
  History as HistoryIcon, Play, Copy, Clock, Hash, FileText, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function HistoryPage() {
  const { toast } = useToast();
  const { t } = useI18n();

  const { data: history, isLoading } = useQuery<GeneratedPrompt[]>({
    queryKey: ["/api/history"],
  });

  const handleCopy = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    toast({ title: t.studio.promptCopied });
  };

  const handleCopySeed = async (seed: string) => {
    await navigator.clipboard.writeText(seed);
    toast({ title: "Seed copied to clipboard" });
  };

  const formatDate = (dateStr: string | Date) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return "Unknown date";
    }
  };

  const formatTime = (dateStr: string | Date) => {
    try {
      return format(new Date(dateStr), "h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      {/* Minimal Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.history.title}</h1>
          <p className="text-white/40 text-sm mt-1">{t.history.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0 bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-32 bg-white/10" />
                      <Skeleton className="h-4 w-20 rounded-full bg-white/10" />
                    </div>
                    <Skeleton className="h-3 w-full bg-white/5" />
                    <Skeleton className="h-3 w-2/3 bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
              <HistoryIcon className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white/60 mb-2">{t.history.noHistory}</h3>
            <p className="text-sm text-white/30 mb-6 max-w-xs mx-auto">
              {t.history.noHistoryDesc || "Start generating prompts to see them here"}
            </p>
            <Link href="/image-studio">
              <Button
                size="sm"
                className="bg-white text-black hover:bg-white/90 px-6 h-9 text-xs font-medium"
              >
                {t.history.goToStudio}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="group p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all duration-300"
                data-testid={`card-history-${item.id}`}
              >
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <FileText className="w-5 h-5 text-white/30 group-hover:text-white/60" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                        {item.metadata?.blueprintName || "Untitled Generation"}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                        {item.metadata?.profileName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border border-white/10 bg-white/5 text-white/60`}>
                        Score: {item.score}
                      </span>
                    </div>

                    <p className="text-xs text-white/40 line-clamp-2 mb-4 font-mono leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                      {item.compiledPrompt}
                    </p>

                    <div className="flex items-center gap-3 md:gap-5 text-[10px] text-white/30 flex-wrap">
                      <span className="flex items-center gap-1.5 uppercase tracking-tighter">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                        <span className="opacity-20">•</span>
                        <span>{formatTime(item.createdAt)}</span>
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopySeed(item.seed); }}
                        className="flex items-center gap-1.5 hover:text-white transition-colors group/seed"
                      >
                        <Hash className="w-3 h-3 group-hover/seed:text-white" />
                        <code className="bg-white/5 px-2 py-0.5 rounded text-white/40 group-hover/seed:text-white group-hover/seed:bg-white/10">
                          {item.seed}
                        </code>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation(); handleCopy(item.compiledPrompt); }}
                      data-testid={`button-copy-${item.id}`}
                      title="Copy prompt"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Link href={`/image-studio?seed=${item.seed}&blueprint=${item.blueprintId}&profile=${item.profileId}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                        data-testid={`button-replay-${item.id}`}
                        title="Replay in Studio"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
            © 2025 VECTRA AI
          </p>
        </footer>
      </div>
    </div>
  );
}
