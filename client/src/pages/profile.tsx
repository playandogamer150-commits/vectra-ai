import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  User, Settings, BarChart3, ArrowRight, Image, History, FolderOpen,
  Crown, Loader2, Check, CreditCard, ExternalLink, Camera, X, ImagePlus,
  Trash2, SlidersHorizontal, Maximize, ZoomIn, RotateCw, RefreshCcw, Minus, Plus, ArrowLeft,
  ImageIcon, Video, Grid3X3, Eye
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import Cropper from 'react-easy-crop';
import getCroppedImg from "@/lib/image-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { BannerPreview, BannerEditorControls, BannerFilterControls } from "@/components/banner-editor";

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

// P2 FIX: Improved default banner gradients
const DEFAULT_BANNERS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
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
  bannerUrl?: string | null;
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
  daily?: {
    prompts?: { used: number; limit: number };
    images?: { used: number; limit: number };
    videos?: { used: number; limit: number };
  };
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [bannerToCrop, setBannerToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
  });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<{
    displayName: string;
    tagline: string;
    timezone: string;
    defaultLanguage: string;
    defaultLlmProfileId: string | null;
    theme: string;
    email: string;
  }>({
    displayName: "",
    tagline: "",
    timezone: "America/Sao_Paulo",
    defaultLanguage: language,
    defaultLlmProfileId: null,
    theme: "system",
    email: "",
  });

  // P0 FIX: Auth state validation with redirect
  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
    retry: false, // Não retentar em 401
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/profile/usage"],
    enabled: !!profile, // Só buscar usage se profile existir
  });

  // P0 FIX: Redirect unauthenticated users
  useEffect(() => {
    if (profileError) {
      window.location.href = "/api/login";
    }
  }, [profileError]);

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "Selecione um arquivo de imagem válido."
          : "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "A imagem deve ter no máximo 10MB."
          : "Image must be 10MB or less.",
        variant: "destructive",
      });
      return;
    }

    setAvatarUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const imageData = reader.result as string;
          const response = await apiRequest("POST", "/api/profile/avatar", { imageData });
          const data = await response.json();

          if (data.success) {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            toast({
              title: language === "pt-BR" ? "Foto atualizada" : "Photo updated",
              description: language === "pt-BR"
                ? "Sua foto de perfil foi atualizada com sucesso."
                : "Your profile photo has been updated successfully.",
            });
          }
        } catch {
          toast({
            title: t.common.error,
            description: language === "pt-BR"
              ? "Erro ao enviar a foto. Tente novamente."
              : "Failed to upload photo. Please try again.",
            variant: "destructive",
          });
        } finally {
          setAvatarUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarUploading(false);
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "Erro ao processar a imagem."
          : "Failed to process image.",
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "Selecione um arquivo de imagem válido."
          : "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) { // Increased to 15MB for convenience
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "A imagem deve ter no máximo 15MB."
          : "Image must be 15MB or less.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBannerToCrop(reader.result as string);
      setBannerEditorOpen(true);
      setZoom(1);
      setRotation(0);
      setFilters({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
      });
      setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleApplyBanner = async () => {
    if (!bannerToCrop || !croppedAreaPixels) return;

    setBannerUploading(true);
    try {
      const croppedImage = await getCroppedImg(
        bannerToCrop,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        filters
      );
      if (!croppedImage) throw new Error("Cropping failed");

      const response = await apiRequest("POST", "/api/profile/banner", { imageData: croppedImage });
      const data = await response.json();

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        setBannerEditorOpen(false);
        setBannerToCrop(null);
        toast({
          title: language === "pt-BR" ? "Banner atualizado" : "Banner updated",
          description: language === "pt-BR"
            ? "Seu banner foi ajustado e salvo com sucesso."
            : "Your banner has been adjusted and saved successfully.",
        });
      }
    } catch (error) {
      console.error("Banner upload error:", error);
      toast({
        title: t.common.error,
        description: (error instanceof Error ? error.message : String(error)) || (language === "pt-BR"
          ? "Erro ao salvar o banner. Tente novamente."
          : "Failed to save banner. Please try again."),
        variant: "destructive",
      });
    } finally {
      setBannerUploading(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      const response = await apiRequest("DELETE", "/api/profile/banner", {});
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({
          title: language === "pt-BR" ? "Banner removido" : "Banner removed",
          description: language === "pt-BR"
            ? "O banner padrão foi restaurado."
            : "Default banner has been restored.",
        });
      }
    } catch (error) {
      toast({
        title: t.common.error,
        description: language === "pt-BR" ? "Erro ao remover" : "Failed to remove",
        variant: "destructive"
      });
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await apiRequest("DELETE", "/api/profile/avatar", {});
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: language === "pt-BR" ? "Foto removida" : "Photo removed",
        description: language === "pt-BR"
          ? "Sua foto de perfil foi removida."
          : "Your profile photo has been removed.",
      });
    } catch {
      toast({
        title: t.common.error,
        description: language === "pt-BR"
          ? "Erro ao remover a foto."
          : "Failed to remove photo.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        tagline: profile.tagline || "",
        timezone: profile.timezone || "America/Sao_Paulo",
        defaultLanguage: profile.defaultLanguage || language,
        defaultLlmProfileId: profile.defaultLlmProfileId,
        theme: profile.theme || "system",
        email: profile.email || "",
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
      email: formData.email !== profile?.email ? formData.email : undefined,
    });

    if (formData.defaultLanguage !== language) {
      setLanguage(formData.defaultLanguage as "en" | "pt-BR");
    }

    setTheme(formData.theme as "light" | "dark" | "system");
  };

  const isPro = usage?.plan === "pro";

  // Get banner style
  const getBannerStyle = () => {
    if (profile?.bannerUrl) {
      return { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    // Use a subtle gradient based on username hash for variety
    const hash = (profile?.username || "user").charCodeAt(0) % DEFAULT_BANNERS.length;
    return { background: DEFAULT_BANNERS[hash] };
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
          <Skeleton className="h-48 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-8 w-48 bg-white/10" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 bg-white/5 rounded-xl" />
            <Skeleton className="h-64 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

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

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.profile.title}</h1>
          <p className="text-white/40 text-sm mt-1">{t.profile.subtitle}</p>
        </div>

        {/* Profile Banner Section */}
        <div className="relative mb-8 rounded-xl overflow-hidden border border-white/10">
          {/* Banner */}
          <div
            className="h-32 md:h-40 relative group cursor-pointer"
            style={getBannerStyle()}
          >
            {/* Banner overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {bannerUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 bg-white text-black hover:bg-white/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      bannerInputRef.current?.click();
                    }}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    {language === "pt-BR" ? "Alterar" : "Change"}
                  </Button>

                  {profile?.bannerUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBanner();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === "pt-BR" ? "Remover" : "Remove"}
                    </Button>
                  )}
                </>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerUpload}
              disabled={bannerUploading}
            />
          </div>

          {/* Profile Info overlapping banner */}
          <div className="relative px-4 md:px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative group">
                <div className="relative rounded-full p-[2px] bg-black">
                  <Avatar className="h-24 w-24 border-4 border-black">
                    <AvatarImage
                      src={profile?.avatarUrl || undefined}
                      alt={profile?.displayName || profile?.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-white/10 text-white">
                      {(profile?.displayName || profile?.username || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  id="avatar-upload"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />

                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label={language === "pt-BR" ? "Alterar foto de perfil" : "Change profile picture"}
                >
                  {avatarUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </label>

                {profile?.avatarUrl && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20"
                    onClick={handleRemoveAvatar}
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>
                )}
              </div>

              {/* Name and details */}
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {profile?.displayName || profile?.username}
                  </h2>
                  {isPro && (
                    <Badge className="bg-white text-black text-[10px] px-1.5 py-0">
                      <Crown className="w-2.5 h-2.5 mr-0.5" />
                      PRO
                    </Badge>
                  )}
                </div>
                <p className="text-white/40 text-sm">@{profile?.username}</p>
                {profile?.tagline && (
                  <p className="text-white/60 text-xs mt-1">{profile.tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Personal Info Card */}
          <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-semibold text-white">{t.profile.personalInfo}</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs text-white/90">{t.profile.displayName}</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={language === "pt-BR" ? "Seu nome de exibição" : "Your display name"}
                  className="h-9 bg-white/5 border-white/10 text-white placeholder:text-white/60 focus:border-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-white/90">{t.profile.email}</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="h-9 bg-white/5 border-white/10 text-white placeholder:text-white/60 focus:border-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tagline" className="text-xs text-white/90">{t.profile.tagline}</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder={language === "pt-BR" ? "Uma breve descrição sobre você" : "A short description about yourself"}
                  className="h-9 bg-white/5 border-white/10 text-white placeholder:text-white/60 focus:border-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone" className="text-xs text-white/90">{t.profile.timezone}</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger id="timezone" className="h-9 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={language === "pt-BR" ? "Selecione o fuso horário" : "Select timezone"} />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz} className="text-white hover:bg-white/10">
                        {tz.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-semibold text-white">{t.profile.preferences}</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-xs text-white/90">{t.profile.language}</Label>
                <Select
                  value={formData.defaultLanguage}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, defaultLanguage: v }))}
                >
                  <SelectTrigger id="language" className="h-9 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={language === "pt-BR" ? "Selecione o idioma" : "Select language"} />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="en" className="text-white hover:bg-white/10">English</SelectItem>
                    <SelectItem value="pt-BR" className="text-white hover:bg-white/10">Português (Brasil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultProfile" className="text-xs text-white/90">{t.profile.defaultProfile}</Label>
                <Select
                  value={formData.defaultLlmProfileId || "auto"}
                  onValueChange={(v) => setFormData(prev => ({
                    ...prev,
                    defaultLlmProfileId: v === "auto" ? null : v
                  }))}
                >
                  <SelectTrigger id="defaultProfile" className="h-9 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={language === "pt-BR" ? "Selecione o perfil" : "Select profile"} />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="auto" className="text-white hover:bg-white/10">{t.profile.autoSelect}</SelectItem>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/10">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Plan & Usage Card */}
          <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-semibold text-white">{t.profile.planAndUsage}</h3>
            </div>

            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/5">
              <span className="text-xs text-white/60">{t.profile.currentPlan}</span>
              <Badge
                className={isPro
                  ? "bg-white text-black text-[10px]"
                  : "bg-white/10 text-white/60 text-[10px]"
                }
              >
                {isPro && <Crown className="w-2.5 h-2.5 mr-1" />}
                {isPro ? "PRO" : "FREE"}
              </Badge>
            </div>

            {usageLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-white/5">
                  <span className="text-white/40">{t.profile.promptsToday}</span>
                  <span className="text-white font-medium">
                    {usage?.daily?.prompts?.used || 0}
                    {!isPro && <span className="text-white/40">/{usage?.daily?.prompts?.limit || 3}</span>}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white/5">
                  <span className="text-white/40">{t.profile.imagesGenerated}</span>
                  <span className="text-white font-medium">{usage?.daily?.images?.used || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white/5">
                  <span className="text-white/40">{t.profile.videosGenerated}</span>
                  <span className="text-white font-medium">{usage?.daily?.videos?.used || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white/5">
                  <span className="text-white/40">{t.profile.blueprintsSaved}</span>
                  <span className="text-white font-medium">
                    {usage?.blueprintsSaved || 0}
                    {!isPro && <span className="text-white/40">/5</span>}
                  </span>
                </div>
              </div>
            )}

            {!isPro && (
              <Link href="/pricing">
                <Button className="w-full mt-4 bg-white text-black hover:bg-white/90 h-9 text-xs font-medium">
                  <Crown className="w-3 h-3 mr-2" />
                  {t.profile.upgradeToPro}
                </Button>
              </Link>
            )}

            {isPro && profile?.stripeCustomerId && (
              <Button
                className="w-full mt-4 h-9 text-xs border-white/10 text-white/80"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await apiRequest("POST", "/api/stripe/portal", {});
                    const data = await response.json();
                    if (data.url) {
                      window.location.href = data.url;
                    }
                  } catch {
                    toast({
                      title: t.common.error,
                      description: language === "pt-BR"
                        ? "Não foi possível abrir o portal de pagamento."
                        : "Could not open billing portal.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <CreditCard className="w-3 h-3 mr-2" />
                {language === "pt-BR" ? "Gerenciar Assinatura" : "Manage Subscription"}
                <ExternalLink className="w-2.5 h-2.5 ml-2" />
              </Button>
            )}
          </div>

          {/* Quick Links Card */}
          <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-semibold text-white">{t.profile.quickLinks}</h3>
            </div>
            <div className="space-y-2">
              <Link href="/library">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-2" />
                  {t.profile.goToBlueprints}
                </Button>
              </Link>
              <Link href="/history">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <History className="w-3.5 h-3.5 mr-2" />
                  {t.profile.goToHistory}
                </Button>
              </Link>
              <Link href="/image-studio">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <Image className="w-3.5 h-3.5 mr-2" />
                  {t.profile.goToStudio}
                </Button>
              </Link>
              <Link href="/gallery/images">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-2" />
                  {language === "pt-BR" ? "Galeria de Imagens" : "Image Gallery"}
                </Button>
              </Link>
              <Link href="/gallery/videos">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <Video className="w-3.5 h-3.5 mr-2" />
                  {language === "pt-BR" ? "Galeria de Vídeos" : "Video Gallery"}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-white text-black hover:bg-white/90 h-9 px-6 text-xs font-medium"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                {t.profile.saving}
              </>
            ) : (
              <>
                <Check className="w-3 h-3 mr-2" />
                {t.profile.saveChanges}
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
            © 2025 VECTRA AI
          </p>
        </footer>
      </div>

      {/* Banner Editor Modal - ENHANCED VERSION */}
      <Dialog open={bannerEditorOpen} onOpenChange={setBannerEditorOpen}>
        <DialogContent
          className="max-w-5xl w-[95vw] bg-[#0a0a0b] border-white/10 text-white p-0 overflow-hidden shadow-2xl"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header with Dimensions */}
          <DialogHeader className="p-4 border-b border-white/10 bg-[#0a0a0b] shrink-0">
            <div className="flex items-center justify-between w-full pr-8">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-white/60" />
                <span>{language === "pt-BR" ? "Editor de Banner" : "Banner Editor"}</span>
              </DialogTitle>

              {/* Dimensions Badge */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-mono text-green-400">
                    1152 × 274 px
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-white/40">
                  <span>Aspect: 4.2:1</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(90vh - 140px)', maxHeight: '600px' }}>

            {/* Cropper Area - Enhanced with visible selection box */}
            <div className="flex-1 lg:flex-[2] relative overflow-hidden bg-black min-h-[300px]">
              {/* Enhanced Crop Area Styles */}
              <style dangerouslySetInnerHTML={{
                __html: `
                /* Container */
                .react-easy-crop_Container { 
                  background: #000 !important; 
                }
                
                /* ENHANCED CROP AREA - Caixa de Seleção Visível */
                .react-easy-crop_CropArea {
                  border: 3px solid #FFFFFF !important;
                  box-shadow: 
                    0 0 0 9999px rgba(0, 0, 0, 0.8) !important,
                    inset 0 0 0 1px rgba(255, 255, 255, 0.3) !important,
                    0 0 20px rgba(255, 255, 255, 0.1) !important;
                  color: #FFFFFF !important;
                }
                
                /* Corner Handles */
                .react-easy-crop_CropArea::before {
                  content: '';
                  position: absolute;
                  top: -4px;
                  left: -4px;
                  right: -4px;
                  bottom: -4px;
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  border-radius: 2px;
                  pointer-events: none;
                }
                
                /* Rule of Thirds Grid - More Visible */
                .react-easy-crop_CropAreaGrid::before {
                  border-color: rgba(255, 255, 255, 0.3) !important;
                  border-width: 1px !important;
                }
                .react-easy-crop_CropAreaGrid::after {
                  border-color: rgba(255, 255, 255, 0.3) !important;
                  border-width: 1px !important;
                }
                
                /* Additional Grid Lines for better alignment */
                .react-easy-crop_CropAreaRound,
                .react-easy-crop_CropAreaGrid {
                  background-image: 
                    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
                  background-size: 20% 20%;
                }
              `}} />

              {bannerToCrop && (
                <Cropper
                  image={bannerToCrop}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={4.2}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  onZoomChange={setZoom}
                  showGrid={showGrid}
                  style={{
                    containerStyle: { width: '100%', height: '100%' },
                    mediaStyle: {
                      filter: beforeAfterMode
                        ? 'none'
                        : `
                          brightness(${filters.brightness}%) 
                          contrast(${filters.contrast}%) 
                          saturate(${filters.saturation}%) 
                          grayscale(${filters.grayscale}%) 
                          sepia(${filters.sepia}%) 
                          blur(${filters.blur}px)
                        `
                    }
                  }}
                />
              )}

              {/* Overlay with Dimensions and Instructions */}
              <div className="absolute top-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {/* Dimensions Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur rounded-lg border border-white/10">
                  <Maximize className="w-3 h-3 text-white/60" />
                  <span className="text-[11px] font-mono text-white/80">
                    {croppedAreaPixels?.width || 1152} × {croppedAreaPixels?.height || 274}
                  </span>
                </div>

                {/* Zoom/Rotation Info */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur rounded-lg border border-white/10">
                  <ZoomIn className="w-3 h-3 text-white/60" />
                  <span className="text-[11px] font-mono text-white/60">
                    {Math.round(zoom * 100)}%
                  </span>
                  <span className="text-white/20">|</span>
                  <RotateCw className="w-3 h-3 text-white/60" />
                  <span className="text-[11px] font-mono text-white/60">
                    {rotation}°
                  </span>
                </div>
              </div>

              {/* Bottom Instructions */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur rounded-full border border-white/10 text-[10px] uppercase tracking-widest text-white/50 pointer-events-none">
                <Maximize className="w-3 h-3" />
                {language === "pt-BR" ? "Arraste para ajustar a posição" : "Drag to adjust position"}
              </div>

              {/* Grid Toggle Button */}
              <button
                className={`absolute top-4 right-4 z-[100] p-2 rounded-lg border transition-all ${showGrid
                    ? 'bg-white/10 border-white/20 text-white/80'
                    : 'bg-black/60 border-white/10 text-white/40'
                  }`}
                onClick={() => setShowGrid(!showGrid)}
                title={language === "pt-BR" ? "Mostrar/Ocultar Grid" : "Toggle Grid"}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Controls Sidebar */}
            <div className="w-full lg:w-80 flex flex-col bg-[#0f0f10] border-l border-white/5 overflow-hidden shrink-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Live Preview - Mini version */}
                <BannerPreview
                  imageUrl={bannerToCrop}
                  zoom={zoom}
                  rotation={rotation}
                  filters={filters}
                  croppedAreaPixels={croppedAreaPixels}
                  displayName={profile?.displayName || profile?.username || "User"}
                  username={profile?.username || "user"}
                  avatarUrl={profile?.avatarUrl || null}
                  isPro={usage?.plan === "pro"}
                  language={language}
                />

                {/* Transform Controls */}
                <BannerEditorControls
                  zoom={zoom}
                  rotation={rotation}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onReset={() => {
                    setZoom(1);
                    setRotation(0);
                    setCrop({ x: 0, y: 0 });
                  }}
                  language={language}
                />

                {/* Filter Controls */}
                <BannerFilterControls
                  filters={filters}
                  onFilterChange={(filter, value) => setFilters(f => ({ ...f, [filter]: value }))}
                  onReset={() => setFilters({
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    grayscale: 0,
                    sepia: 0,
                    blur: 0,
                  })}
                  beforeAfterMode={beforeAfterMode}
                  onBeforeAfterToggle={() => setBeforeAfterMode(!beforeAfterMode)}
                  language={language}
                />
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-white/10 bg-black/30 flex flex-col gap-2 shrink-0">
                <Button
                  className="w-full bg-white text-black hover:bg-white/90 h-10 font-bold"
                  onClick={handleApplyBanner}
                  disabled={bannerUploading}
                >
                  {bannerUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === "pt-BR" ? "Salvando..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {language === "pt-BR" ? "Aplicar Banner" : "Apply Banner"}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-white/40 hover:text-white hover:bg-white/5 h-9"
                  onClick={() => {
                    setBannerEditorOpen(false);
                    setBannerToCrop(null);
                    setBeforeAfterMode(false);
                  }}
                >
                  {language === "pt-BR" ? "Cancelar" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
