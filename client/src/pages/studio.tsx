import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LlmProfile, PromptBlueprint, Filter, GeneratedPrompt } from "@shared/schema";
import { 
  Zap, Copy, Download, Save, Share2, RefreshCw, AlertTriangle, 
  CheckCircle, ChevronDown, ChevronUp, Gauge, Layers, SlidersHorizontal,
  Sparkles, FileText
} from "lucide-react";

type FilterValue = Record<string, string>;

export default function StudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<FilterValue>({});
  const [seed, setSeed] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [items, setItems] = useState("");
  const [environment, setEnvironment] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [result, setResult] = useState<GeneratedPrompt | null>(null);

  const { data: profiles, isLoading: loadingProfiles } = useQuery<LlmProfile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: blueprints, isLoading: loadingBlueprints } = useQuery<PromptBlueprint[]>({
    queryKey: ["/api/blueprints"],
  });

  const { data: filters, isLoading: loadingFilters } = useQuery<Filter[]>({
    queryKey: ["/api/filters"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate", {
        profileId: selectedProfile,
        blueprintId: selectedBlueprint,
        filters: activeFilters,
        seed: seed || undefined,
        subject,
        context,
        items,
        environment,
        restrictions,
      });
      return res.json();
    },
    onSuccess: (data: GeneratedPrompt) => {
      setResult(data);
      setSeed(data.seed);
      toast({ title: t.studio.copied });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
    onError: (error: Error) => {
      toast({ title: t.studio.errorGenerating, description: error.message, variant: "destructive" });
    },
  });

  const handleRandomSeed = () => {
    const newSeed = Math.random().toString(36).substring(2, 10);
    setSeed(newSeed);
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.compiledPrompt);
      toast({ title: t.studio.promptCopied });
    }
  };

  const handleExportJSON = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-${result.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "JSON exported!" });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const canGenerate = selectedProfile && selectedBlueprint;

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-studio-title">{t.studio.title}</h1>
          <p className="text-muted-foreground">{t.studio.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <aside className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t.studio.llmProfile}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingProfiles ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-2">
                      {profiles?.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => setSelectedProfile(profile.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedProfile === profile.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover-elevate"
                          }`}
                          data-testid={`button-profile-${profile.id}`}
                        >
                          <div className="font-medium text-sm">{profile.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Max {profile.maxLength} chars
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {t.studio.blueprint}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingBlueprints ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-2">
                      {blueprints?.map((blueprint) => (
                        <button
                          key={blueprint.id}
                          onClick={() => setSelectedBlueprint(blueprint.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedBlueprint === blueprint.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover-elevate"
                          }`}
                          data-testid={`button-blueprint-${blueprint.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{blueprint.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {blueprint.category}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {blueprint.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-between w-full"
                  data-testid="button-toggle-filters"
                >
                  <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    {t.studio.filters}
                  </CardTitle>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CardHeader>
              {showFilters && (
                <CardContent>
                  {loadingFilters ? (
                    <div className="flex flex-wrap gap-4">
                      <Skeleton className="h-10 w-40" />
                      <Skeleton className="h-10 w-40" />
                      <Skeleton className="h-10 w-40" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {filters?.map((filter) => (
                        <div key={filter.id} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                          <div className="flex flex-wrap gap-1">
                            {(filter.schema as { options?: string[] })?.options?.map((option) => (
                              <Button
                                key={option}
                                variant={activeFilters[filter.key] === option ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleFilterChange(filter.key, option)}
                                data-testid={`button-filter-${filter.key}-${option}`}
                              >
                                {option}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t.studio.inputFields}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t.studio.subject}</Label>
                    <Input
                      id="subject"
                      placeholder={t.studio.subjectPlaceholder}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      data-testid="input-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="environment">{t.studio.environment}</Label>
                    <Input
                      id="environment"
                      placeholder={t.studio.environmentPlaceholder}
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      data-testid="input-environment"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">{t.studio.context}</Label>
                  <Textarea
                    id="context"
                    placeholder={t.studio.contextPlaceholder}
                    className="min-h-24"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    data-testid="input-context"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="items">{t.studio.items}</Label>
                    <Input
                      id="items"
                      placeholder={t.studio.itemsPlaceholder}
                      value={items}
                      onChange={(e) => setItems(e.target.value)}
                      data-testid="input-items"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restrictions">{t.studio.restrictions}</Label>
                    <Input
                      id="restrictions"
                      placeholder={t.studio.restrictionsPlaceholder}
                      value={restrictions}
                      onChange={(e) => setRestrictions(e.target.value)}
                      data-testid="input-restrictions"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="seed">{t.studio.seed}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="seed"
                        placeholder={t.studio.seedPlaceholder}
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        className="font-mono"
                        data-testid="input-seed"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRandomSeed}
                        data-testid="button-random-seed"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full md:w-auto gap-2"
              onClick={() => generateMutation.mutate()}
              disabled={!canGenerate || generateMutation.isPending}
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t.studio.generating}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t.studio.generatePrompt}
                </>
              )}
            </Button>

            {result && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      {t.studio.generatedPrompt}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" data-testid="badge-profile">
                        {result.metadata?.profileName}
                      </Badge>
                      <Badge variant="secondary" data-testid="badge-blueprint">
                        {result.metadata?.blueprintName}
                      </Badge>
                      <Badge 
                        variant={result.score >= 80 ? "default" : result.score >= 60 ? "secondary" : "outline"}
                        className="gap-1"
                        data-testid="badge-score"
                      >
                        <Gauge className="w-3 h-3" />
                        {t.studio.qualityScore}: {result.score}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        {result.warnings.map((warning, i) => (
                          <div key={i}>{warning}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-compiled-prompt">
                    {result.compiledPrompt}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2" data-testid="button-copy">
                      <Copy className="w-4 h-4" />
                      {t.studio.copyToClipboard}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2" data-testid="button-export">
                      <Download className="w-4 h-4" />
                      {t.studio.exportJson}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-save">
                      <Save className="w-4 h-4" />
                      {t.studio.saveVersion}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-share">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3" />
                    <span>Seed: <code className="font-mono bg-muted px-1 rounded">{result.seed}</code></span>
                    <span className="mx-2">|</span>
                    <span>{result.metadata?.blockCount} {t.studio.blocksUsed}</span>
                    <span className="mx-2">|</span>
                    <span>{result.metadata?.filterCount} {t.studio.filtersApplied}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
