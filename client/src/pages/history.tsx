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
    <div className="min-h-screen pt-16">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-history-title">{t.history.title}</h1>
          <p className="text-muted-foreground">{t.history.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
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
          <Card className="text-center py-16">
            <CardContent>
              <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t.history.noHistory}</h3>
              <p className="text-muted-foreground mb-6">
                {t.history.noHistoryDesc}
              </p>
              <Link href="/studio">
                <Button className="gap-2">
                  <Zap className="w-4 h-4" />
                  {t.history.goToStudio}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4 pr-4">
              {history.map((item) => (
                <Card key={item.id} className="group" data-testid={`card-history-${item.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium truncate">
                            {item.metadata?.blueprintName || "Untitled"}
                          </h3>
                          <Badge variant="secondary" className="shrink-0">
                            {item.metadata?.profileName}
                          </Badge>
                          <Badge 
                            variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "outline"}
                            className="gap-1 shrink-0"
                          >
                            <Gauge className="w-3 h-3" />
                            {t.history.score}: {item.score}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-mono">
                          {item.compiledPrompt}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.createdAt)}
                          </span>
                          <span>Seed: <code className="font-mono bg-muted px-1 rounded">{item.seed}</code></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(item.compiledPrompt)}
                          data-testid={`button-copy-${item.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Link href={`/studio?seed=${item.seed}&blueprint=${item.blueprintId}&profile=${item.profileId}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-replay-${item.id}`}>
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
