import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import type { GeneratedPrompt } from "@shared/schema";
import { 
  History as HistoryIcon, Play, Copy, Clock, Zap, 
  ChevronRight, FileText, Hash
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
    if (score >= 80) return "text-foreground bg-foreground/5";
    if (score >= 60) return "text-muted-foreground bg-muted";
    return "text-muted-foreground bg-muted";
  };

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-medium tracking-tight mb-2" data-testid="text-history-title">
            {t.history.title}
          </h1>
          <p className="text-muted-foreground text-base">{t.history.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start gap-5">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
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
          <div className="bg-card rounded-xl border border-border text-center py-20 px-6">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-5">
              <HistoryIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t.history.noHistory}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t.history.noHistoryDesc}
            </p>
            <Link href="/studio">
              <Button className="gap-2">
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
                  className="group bg-card rounded-xl border border-border p-6 hover:border-foreground/20 transition-all duration-200 cursor-pointer"
                  data-testid={`card-history-${item.id}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-medium">
                          {item.metadata?.blueprintName || "Untitled"}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                          {item.metadata?.profileName}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(item.score)}`}>
                          Score: {item.score}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-mono leading-relaxed">
                        {item.compiledPrompt}
                      </p>
                      
                      <div className="flex items-center gap-5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(item.createdAt)}</span>
                          <span className="opacity-30">|</span>
                          <span>{formatTime(item.createdAt)}</span>
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCopySeed(item.seed); }}
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        >
                          <Hash className="w-3.5 h-3.5" />
                          <code className="font-mono bg-secondary px-2 py-0.5 rounded-md text-[11px]">
                            {item.seed}
                          </code>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); handleCopy(item.compiledPrompt); }}
                        data-testid={`button-copy-${item.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Link href={`/studio?seed=${item.seed}&blueprint=${item.blueprintId}&profile=${item.profileId}`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg"
                          data-testid={`button-replay-${item.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </Link>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
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
