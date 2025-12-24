import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import type { GeneratedPrompt } from "@shared/schema";
import { 
  History as HistoryIcon, Play, Copy, Clock, Zap, 
  ChevronRight, FileText, Sparkles, Hash
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10";
    if (score >= 60) return "text-amber-600 bg-amber-50 dark:bg-amber-500/10";
    return "text-[#64748B] bg-[#F1F5F9] dark:bg-muted";
  };

  return (
    <div className="min-h-screen pt-14 bg-[#FAFAFA] dark:bg-background">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-foreground mb-2" data-testid="text-history-title">
            {t.history.title}
          </h1>
          <p className="text-[#64748B] dark:text-muted-foreground text-base">{t.history.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6">
                <div className="flex items-start gap-5">
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center mx-auto mb-5">
              <HistoryIcon className="w-8 h-8 text-[#A855F7]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-foreground mb-2">{t.history.noHistory}</h3>
            <p className="text-[#64748B] dark:text-muted-foreground mb-6 max-w-sm mx-auto">
              {t.history.noHistoryDesc}
            </p>
            <Link href="/studio">
              <Button className="gap-2 bg-gradient-to-r from-[#A855F7] to-[#EC4899] hover:opacity-90 text-white border-0 rounded-xl">
                <Zap className="w-4 h-4" />
                {t.history.goToStudio}
              </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4 pr-2">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="group bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6 hover:border-[#A855F7]/20 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)] transition-all duration-200 cursor-pointer"
                  data-testid={`card-history-${item.id}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-[#A855F7]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-[#0F172A] dark:text-foreground">
                          {item.metadata?.blueprintName || "Untitled"}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B] dark:text-muted-foreground">
                          {item.metadata?.profileName}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getScoreColor(item.score)}`}>
                          Score: {item.score}
                        </span>
                      </div>
                      
                      <p className="text-sm text-[#64748B] dark:text-muted-foreground line-clamp-2 mb-4 font-mono leading-relaxed">
                        {item.compiledPrompt}
                      </p>
                      
                      <div className="flex items-center gap-5 text-xs text-[#64748B] dark:text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(item.createdAt)}</span>
                          <span className="text-black/20 dark:text-white/20">|</span>
                          <span>{formatTime(item.createdAt)}</span>
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCopySeed(item.seed); }}
                          className="flex items-center gap-1.5 hover:text-[#A855F7] transition-colors"
                        >
                          <Hash className="w-3.5 h-3.5" />
                          <code className="font-mono bg-[#F1F5F9] dark:bg-muted px-2 py-0.5 rounded-md text-[11px]">
                            {item.seed}
                          </code>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-[#64748B] hover:text-[#A855F7] hover:bg-[#A855F7]/5"
                        onClick={(e) => { e.stopPropagation(); handleCopy(item.compiledPrompt); }}
                        data-testid={`button-copy-${item.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Link href={`/studio?seed=${item.seed}&blueprint=${item.blueprintId}&profile=${item.profileId}`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl text-[#64748B] hover:text-[#A855F7] hover:bg-[#A855F7]/5"
                          data-testid={`button-replay-${item.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </Link>
                      <ChevronRight className="w-4 h-4 text-[#CBD5E1] dark:text-muted-foreground ml-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
