import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import type { GeneratedPrompt } from "@shared/schema";
import { 
  History as HistoryIcon, Play, Copy, Gauge, Clock, Zap, 
  ChevronRight, FileText
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

  const formatDate = (dateStr: string | Date) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2" data-testid="text-history-title">
            {t.history.title}
          </h1>
          <p className="text-muted-foreground">{t.history.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <Card className="bg-card border-border/50 text-center py-20">
            <CardContent className="pt-0">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                <HistoryIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t.history.noHistory}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {t.history.noHistoryDesc}
              </p>
              <Link href="/studio">
                <Button className="gap-2 rounded-xl">
                  <Zap className="w-4 h-4" />
                  {t.history.goToStudio}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 pr-4">
              {history.map((item) => (
                <Card key={item.id} className="group bg-card border-border/50 transition-all duration-150 hover:border-border" data-testid={`card-history-${item.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium text-sm">
                            {item.metadata?.blueprintName || "Untitled"}
                          </h3>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {item.metadata?.profileName}
                          </Badge>
                          <Badge 
                            variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "outline"}
                            className="gap-1 shrink-0 text-xs"
                          >
                            <Gauge className="w-3 h-3" />
                            {item.score}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-mono leading-relaxed">
                          {item.compiledPrompt}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(item.createdAt)}
                          </span>
                          <span>
                            Seed: <code className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-foreground">{item.seed}</code>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopy(item.compiledPrompt)}
                          data-testid={`button-copy-${item.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Link href={`/studio?seed=${item.seed}&blueprint=${item.blueprintId}&profile=${item.profileId}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" data-testid={`button-replay-${item.id}`}>
                            <Play className="w-4 h-4" />
                          </Button>
                        </Link>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
