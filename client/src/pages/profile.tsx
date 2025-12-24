import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { User, Settings, BarChart3, ArrowRight, Image, History, FolderOpen, Crown, Loader2, Check, CreditCard, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface ProfileData {
  id: string;
  username: string;
  email: string | null;
  plan: string;
  planStatus?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tagline: string | null;
  timezone: string | null;
  defaultLanguage: string | null;
  defaultLlmProfileId: string | null;
  theme: string | null;
}

interface UsageData {
  totalPromptsGenerated: number;
  promptsToday: number;
  totalImagesGenerated: number;
  totalVideosGenerated: number;
  blueprintsSaved: number;
  loraModelsTrained: number;
  plan: string;
  limits: {
    free: { generationsPerDay: number; maxFilters: number; maxBlueprints: number; loraTraining: boolean };
    pro: { generationsPerDay: number; maxFilters: number; maxBlueprints: number; loraTraining: boolean };
  };
}

interface LLMProfile {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  
  const [formData, setFormData] = useState<{
    displayName: string;
    tagline: string;
    timezone: string;
    defaultLanguage: string;
    defaultLlmProfileId: string | null;
    theme: string;
  }>({
    displayName: "",
    tagline: "",
    timezone: "America/Sao_Paulo",
    defaultLanguage: language,
    defaultLlmProfileId: null,
    theme: "system",
  });

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/profile/usage"],
  });

  const { data: profiles } = useQuery<LLMProfile[]>({
    queryKey: ["/api/profiles"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      return apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t.profile.profileUpdated,
        description: t.profile.profileUpdatedDesc,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.profile.errorUpdating,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        tagline: profile.tagline || "",
        timezone: profile.timezone || "America/Sao_Paulo",
        defaultLanguage: profile.defaultLanguage || language,
        defaultLlmProfileId: profile.defaultLlmProfileId,
        theme: profile.theme || "system",
      });
    }
  }, [profile, language]);

  const handleSave = () => {
    updateMutation.mutate({
      displayName: formData.displayName || undefined,
      tagline: formData.tagline || undefined,
      timezone: formData.timezone,
      defaultLanguage: formData.defaultLanguage,
      defaultLlmProfileId: formData.defaultLlmProfileId,
      theme: formData.theme,
    });
    
    if (formData.defaultLanguage !== language) {
      setLanguage(formData.defaultLanguage as "en" | "pt-BR");
    }
    
    setTheme(formData.theme as "light" | "dark" | "system");
  };

  const isPro = usage?.plan === "pro";

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-6 pb-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatarUrl || undefined} alt={profile?.displayName || profile?.username} />
            <AvatarFallback className="text-lg">
              {(profile?.displayName || profile?.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-profile-title">
              {t.profile.title}
            </h1>
            <p className="text-muted-foreground" data-testid="text-profile-subtitle">
              {t.profile.subtitle}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-personal-info">
            <CardHeader className="flex flex-row items-center gap-2 pb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{t.profile.personalInfo}</CardTitle>
                <CardDescription className="text-sm">{t.profile.personalInfoDesc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t.profile.displayName}</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={t.profile.displayNamePlaceholder}
                  data-testid="input-display-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t.profile.email}</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted/50"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">{t.profile.tagline}</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder={t.profile.taglinePlaceholder}
                  data-testid="input-tagline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">{t.profile.timezone}</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue placeholder={t.profile.selectTimezone} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-preferences">
            <CardHeader className="flex flex-row items-center gap-2 pb-4">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{t.profile.preferences}</CardTitle>
                <CardDescription className="text-sm">{t.profile.preferencesDesc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{t.profile.language}</Label>
                <Select
                  value={formData.defaultLanguage}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, defaultLanguage: v }))}
                >
                  <SelectTrigger id="language" data-testid="select-language">
                    <SelectValue placeholder={t.profile.selectLanguage} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">{t.profile.theme}</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, theme: v }))}
                >
                  <SelectTrigger id="theme" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t.profile.light}</SelectItem>
                    <SelectItem value="dark">{t.profile.dark}</SelectItem>
                    <SelectItem value="system">{t.profile.system}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultProfile">{t.profile.defaultProfile}</Label>
                <Select
                  value={formData.defaultLlmProfileId || "auto"}
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    defaultLlmProfileId: v === "auto" ? null : v
                  }))}
                >
                  <SelectTrigger id="defaultProfile" data-testid="select-default-profile">
                    <SelectValue placeholder={t.profile.selectDefaultProfile} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.profile.autoSelect}</SelectItem>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-plan-usage">
            <CardHeader className="flex flex-row items-center gap-2 pb-4">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{t.profile.planAndUsage}</CardTitle>
                <CardDescription className="text-sm">{t.profile.planAndUsageDesc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.profile.currentPlan}</span>
                <Badge variant={isPro ? "default" : "secondary"} data-testid="badge-plan">
                  {isPro && <Crown className="w-3 h-3 mr-1" />}
                  {isPro ? t.profile.pro : t.profile.free}
                </Badge>
              </div>

              {usageLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.promptsGenerated}</span>
                    <span className="font-medium" data-testid="text-prompts-count">
                      {usage?.totalPromptsGenerated || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.promptsToday}</span>
                    <span className="font-medium" data-testid="text-prompts-today">
                      {usage?.promptsToday || 0}
                      {!isPro && "/3"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.imagesGenerated}</span>
                    <span className="font-medium" data-testid="text-images-count">
                      {usage?.totalImagesGenerated || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.videosGenerated}</span>
                    <span className="font-medium" data-testid="text-videos-count">
                      {usage?.totalVideosGenerated || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.blueprintsSaved}</span>
                    <span className="font-medium" data-testid="text-blueprints-count">
                      {usage?.blueprintsSaved || 0}
                      {!isPro && "/5"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.profile.lorasTrained}</span>
                    <span className="font-medium" data-testid="text-loras-count">
                      {isPro ? (usage?.loraModelsTrained || 0) : "-"}
                    </span>
                  </div>
                </div>
              )}

              {!isPro && (
                <Link href="/pricing">
                  <Button className="w-full mt-2" variant="default" data-testid="button-upgrade">
                    <Crown className="w-4 h-4 mr-2" />
                    {t.profile.upgradeToPro}
                  </Button>
                </Link>
              )}

              {isPro && profile?.stripeCustomerId && (
                <Button 
                  className="w-full mt-2" 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await apiRequest("POST", "/api/stripe/portal", {});
                      const data = await response.json();
                      if (data.url) {
                        window.location.href = data.url;
                      }
                    } catch (error) {
                      toast({
                        title: t.common.error,
                        description: language === "pt-BR" 
                          ? "Não foi possível abrir o portal de pagamento." 
                          : "Could not open billing portal.",
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-manage-subscription"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {language === "pt-BR" ? "Gerenciar Assinatura" : "Manage Subscription"}
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-quick-links">
            <CardHeader className="flex flex-row items-center gap-2 pb-4">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{t.profile.quickLinks}</CardTitle>
                <CardDescription className="text-sm">{t.profile.quickLinksDesc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/library">
                <Button variant="ghost" className="w-full justify-start" data-testid="link-blueprints">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {t.profile.goToBlueprints}
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start" data-testid="link-history">
                  <History className="w-4 h-4 mr-2" />
                  {t.profile.goToHistory}
                </Button>
              </Link>
              <Link href="/image-studio">
                <Button variant="ghost" className="w-full justify-start" data-testid="link-studio">
                  <Image className="w-4 h-4 mr-2" />
                  {t.profile.goToStudio}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.profile.saving}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t.profile.saveChanges}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
